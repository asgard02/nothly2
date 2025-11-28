/**
 * Script pour ré-extraire le texte des PDFs existants qui n'ont pas de raw_text
 * Usage: npx tsx scripts/re-extract-pdf-text.ts [documentId]
 */

// Charger les variables d'environnement depuis .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { getSupabaseAdmin } from "../lib/db"
import { getStorageBucket } from "../lib/storage"
import pdfParse from "pdf-parse"

const DOCUMENTS_BUCKET = process.env.GCP_STORAGE_BUCKET || process.env.SUPABASE_DOCUMENTS_BUCKET || "documents"

async function reExtractPdfText(documentId?: string) {
  const admin = getSupabaseAdmin()
  if (!admin) {
    console.error("❌ Supabase admin client non configuré")
    console.error("   Vérifiez que NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définis dans .env.local")
    process.exit(1)
  }

  console.log("🔄 Démarrage de la ré-extraction du texte...\n")

  try {
    // Récupérer les documents à traiter
    // On utilise la relation explicite pour éviter l'ambiguïté
    let query = admin
      .from("documents")
      .select("id, title, status, current_version_id, document_versions!document_versions_document_id_fkey(id, storage_path, raw_text)")
      .eq("status", "ready")
      .order("created_at", { ascending: false })

    if (documentId) {
      query = query.eq("id", documentId)
    }

    const { data: documents, error } = await query

    if (error) {
      console.error("❌ Erreur lors de la récupération des documents:", error)
      process.exit(1)
    }

    if (!documents || documents.length === 0) {
      console.log("ℹ️  Aucun document à traiter")
      return
    }

    // Filtrer ceux qui ont besoin d'une extraction (raw_text vide ou < 50 caractères)
    const docsToProcess = documents.filter((doc: any) => {
      const versions = Array.isArray(doc.document_versions) ? doc.document_versions : [doc.document_versions]
      const version = versions.find((v: any) => v.id === doc.current_version_id) || versions[0]
      
      if (!version) return false
      return !version.raw_text || version.raw_text.trim().length < 50
    })

    console.log(`📊 Documents trouvés: ${documents.length}`)
    console.log(`📋 ${docsToProcess.length} document(s) nécessitent une extraction de texte.\n`)

    if (docsToProcess.length === 0) {
      console.log("✅ Tous les documents ont déjà du texte extrait !")
      return
    }

    const bucket = getStorageBucket(DOCUMENTS_BUCKET)
    let processed = 0
    let updated = 0
    let errors = 0

    for (const doc of docsToProcess) {
      console.log(`\n📄 Traitement de: ${doc.title} (${doc.id})...`)

      try {
        // Récupérer la version actuelle
        const versions = Array.isArray(doc.document_versions) ? doc.document_versions : [doc.document_versions]
        const versionId = doc.current_version_id || versions[0]?.id
        
        if (!versionId) {
          console.log("  ⚠️  Aucune version trouvée, ignoré")
          continue
        }

        const version = versions.find((v: any) => v.id === versionId) || versions[0]
        if (!version) {
          console.log("  ⚠️  Version non trouvée, ignoré")
          continue
        }

        // Vérifier si on a un storage_path
        if (!version.storage_path) {
          console.log("  ⚠️  Aucun storage_path dans la base de données, ignoré")
          console.log("  💡 Ce document n'a pas de fichier associé dans le storage")
          errors++
          continue
        }

        // Télécharger le PDF depuis Google Cloud Storage
        console.log(`  📥 Téléchargement depuis: ${version.storage_path}`)
        
        // Nettoyer le chemin (enlever le préfixe du bucket si présent)
        const cleanPath = version.storage_path.replace(`${DOCUMENTS_BUCKET}/`, "").replace(/^documents\//, "")
        const file = bucket.file(cleanPath)
        
        const [exists] = await file.exists()
        if (!exists) {
          console.log(`  ⚠️  Fichier non trouvé dans le storage: ${cleanPath}`)
          console.log(`  💡 Vérifiez que le fichier existe dans le bucket ${DOCUMENTS_BUCKET}`)
          errors++
          continue
        }

        const [buffer] = await file.download()
        console.log(`  📊 Taille du fichier: ${buffer.length} bytes`)

        // Extraire le texte avec pdf-parse
        console.log("  🔍 Extraction du texte...")
        const pdfData = await pdfParse(buffer)
        const extractedText = pdfData.text?.trim() || ""

        if (!extractedText || extractedText.length === 0) {
          console.warn(`  ⚠️  Attention: Aucun texte extrait (PDF scanné/image ?)`)
          console.warn(`  💡 Ce PDF est probablement une image scannée. Pour extraire le texte, vous devrez utiliser OCR (Reconnaissance Optique de Caractères)`)
          errors++
          continue
        }

        console.log(`  ✅ Texte extrait: ${extractedText.length} caractères, ${pdfData.numpages} pages`)

        // Mettre à jour la version du document
        const { error: updateError } = await admin
          .from("document_versions")
          .update({ raw_text: extractedText })
          .eq("id", versionId)

        if (updateError) {
          console.error(`  ❌ Erreur mise à jour DB: ${updateError.message}`)
          errors++
        } else {
          console.log(`  💾 Base de données mise à jour avec succès`)
          updated++
        }

        processed++
      } catch (err: any) {
        console.error(`  ❌ Exception inattendue:`, err.message)
        errors++
      }
    }

    console.log(`\n\n📊 Résumé:`)
    console.log(`  ✅ Traités: ${processed}`)
    console.log(`  🔄 Mis à jour: ${updated}`)
    console.log(`  ❌ Erreurs: ${errors}`)
    
    if (updated > 0) {
      console.log(`\n✅ ${updated} document(s) ont maintenant du texte extrait et devraient fonctionner dans le chat !`)
    }
    
    if (errors > 0) {
      console.log(`\n⚠️  ${errors} document(s) ont des erreurs. Causes possibles:`)
      console.log(`   - PDFs scannés (images uniquement, nécessitent OCR)`)
      console.log(`   - Fichiers manquants dans le storage`)
      console.log(`   - Problèmes de chemin de fichier`)
      console.log(`\n💡 Pour les PDFs scannés, vous devrez utiliser une solution OCR (comme Tesseract.js ou l'API Vision d'OpenAI)`)
    }
  } catch (error: any) {
    console.error("❌ Erreur fatale:", error)
    process.exit(1)
  }
}

// Exécuter le script
const documentId = process.argv[2]
reExtractPdfText(documentId)
  .then(() => {
    console.log("\n✨ Terminé !")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Erreur:", error)
    process.exit(1)
  })

import * as fs from 'fs'
import * as path from 'path'

const jsonPath = '/Users/macbookmae/Downloads/helpdesk-476610-5a85dfb7a670.json'

try {
  const jsonContent = fs.readFileSync(jsonPath, 'utf8')
  const parsed = JSON.parse(jsonContent)
  const oneLine = JSON.stringify(parsed)
  
  console.log('\n✅ JSON valide! Voici la ligne pour votre .env.local:\n')
  console.log(`GCP_SERVICE_ACCOUNT_KEY='${oneLine}'`)
  console.log('\n📋 Détails du compte de service:')
  console.log(`  Email: ${parsed.client_email}`)
  console.log(`  Project ID: ${parsed.project_id}`)
  console.log(`  Type: ${parsed.type}`)
} catch (error: any) {
  console.error('❌ Erreur:', error.message)
  process.exit(1)
}




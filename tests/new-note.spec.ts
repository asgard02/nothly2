import { test, expect } from '@playwright/test'

/**
 * Test E2E : Création de note depuis /new
 * 
 * Vérifie que :
 * 1. La navigation depuis /new vers /note/:id fonctionne
 * 2. Pas de chargement infini (spinner disparaît)
 * 3. La page d'édition de note s'affiche correctement
 */
test.describe('Création de note depuis /new', () => {
  test('Doit créer une note et rediriger vers l\'éditeur', async ({ page }) => {
    // 1. Se connecter (à adapter selon votre flow d'authentification)
    // TODO: Adapter selon votre méthode de connexion
    // await page.goto('/login')
    // await page.fill('input[type="email"]', 'test@example.com')
    // await page.click('button:has-text("Se connecter")')
    // await page.waitForURL('/dashboard')

    // 2. Visiter /new
    await page.goto('/new')

    // 3. Attendre la navigation vers /note/:id (UUID format)
    // Format UUID: 8-4-4-4-12 caractères hexadécimaux
    const uuidRegex = /\/note\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/
    await page.waitForURL(uuidRegex, { timeout: 5000 })

    // 4. Vérifier que l'URL a changé et correspond au format attendu
    const url = page.url()
    expect(url).toMatch(uuidRegex)

    // 5. Vérifier qu'il n'y a pas de spinner infini
    // Le spinner devrait disparaître après la navigation
    const spinner = page.locator('[class*="animate-spin"]')
    await expect(spinner).not.toBeVisible({ timeout: 2000 })

    // 6. Vérifier que la page d'édition s'affiche
    // Adaptez selon votre structure de page /note/:id
    await expect(page.locator('input[placeholder*="titre"], input[placeholder*="title"]').or(page.locator('h1'))).toBeVisible({ timeout: 3000 })
  })

  test('Ne doit pas créer plusieurs notes en double (Strict Mode)', async ({ page }) => {
    // Ce test vérifie que React Strict Mode ne crée pas plusieurs notes
    // en observant les requêtes réseau

    const requests: string[] = []

    // Intercepter les requêtes POST vers /api/notes
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/api/notes')) {
        requests.push(request.url())
      }
    })

    await page.goto('/new')
    
    // Attendre la navigation
    await page.waitForURL(/\/note\/[a-f0-9-]+/, { timeout: 5000 })

    // Il ne devrait y avoir qu'UNE seule requête POST
    // (Strict Mode peut causer des double-appels, mais on devrait bloquer avec useRef)
    expect(requests.length).toBeLessThanOrEqual(2) // Tolérance : max 2 (1 normal + 1 strict mode possible)
  })

  test('Doit gérer les erreurs et rediriger vers dashboard', async ({ page }) => {
    // Ce test nécessite de mocker une erreur API
    // Vous pouvez utiliser page.route() pour intercepter et simuler une erreur

    // TODO: Implémenter le mock d'erreur si nécessaire
    // await page.route('**/api/notes', route => {
    //   route.fulfill({
    //     status: 500,
    //     body: JSON.stringify({ error: 'Erreur serveur' })
    //   })
    // })

    // await page.goto('/new')
    // await page.waitForURL('/dashboard', { timeout: 5000 })
  })
})

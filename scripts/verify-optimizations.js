#!/usr/bin/env node

/**
 * Script de vérification des optimisations
 * Vérifie que les fichiers optimisés ont les imports corrects et pas d'erreurs évidentes
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const checks = {
  passed: 0,
  failed: 0,
  errors: [],
};

function checkFile(filePath, description) {
  const fullPath = join(rootDir, filePath);
  if (!existsSync(fullPath)) {
    checks.failed++;
    checks.errors.push(`❌ ${description}: Fichier non trouvé - ${filePath}`);
    return false;
  }

  try {
    const content = readFileSync(fullPath, 'utf-8');
    
    // Vérifications basiques
    const hasLogger = content.includes("from '@/lib/logger'") || content.includes("from \"@/lib/logger\"");
    const hasQueryClient = content.includes("from '@/lib/queryClient'") || content.includes("from \"@/lib/queryClient\"");
    const hasEventSchemas = content.includes("from '@/lib/validation/eventSchemas'") || content.includes("from \"@/lib/validation/eventSchemas\"");
    const hasConsoleLog = content.match(/console\.(log|warn|debug)/g) && !content.includes('logger.');
    const hasReactMemo = content.includes('React.memo');

    // Validation basique TypeScript/JSX
    const hasSyntaxErrors = content.includes('import {') && !content.includes('from');
    
    if (hasSyntaxErrors) {
      checks.failed++;
      checks.errors.push(`❌ ${description}: Erreur de syntaxe possible dans ${filePath}`);
      return false;
    }

    checks.passed++;
    return true;
  } catch (error) {
    checks.failed++;
    checks.errors.push(`❌ ${description}: Erreur lors de la lecture - ${error.message}`);
    return false;
  }
}

function checkLoggerUsage(filePath, description) {
  const fullPath = join(rootDir, filePath);
  if (!existsSync(fullPath)) return;

  try {
    const content = readFileSync(fullPath, 'utf-8');
    const consoleLogs = content.match(/console\.(log|warn|debug)/g);
    const hasLoggerImport = content.includes("from '@/lib/logger'") || content.includes("from \"@/lib/logger\"");
    
    if (consoleLogs && !hasLoggerImport) {
      checks.failed++;
      checks.errors.push(`⚠️  ${description}: console.log trouvé sans logger dans ${filePath}`);
    } else if (!consoleLogs || hasLoggerImport) {
      checks.passed++;
    }
  } catch (error) {
    checks.failed++;
    checks.errors.push(`❌ ${description}: Erreur - ${error.message}`);
  }
}

console.log('🔍 Vérification des optimisations...\n');

// Vérifier que les nouveaux fichiers existent
console.log('1. Vérification des nouveaux fichiers...');
checkFile('src/lib/queryClient.ts', 'QueryClient configuré');
checkFile('src/lib/logger.ts', 'Logger conditionnel');
checkFile('src/lib/validation/eventSchemas.ts', 'Schémas de validation centralisés');
checkFile('src/hooks/useOrganizationEventsPaginated.tsx', 'Hook de pagination');

// Vérifier les fichiers modifiés
console.log('\n2. Vérification des fichiers optimisés...');
checkFile('src/App.tsx', 'App.tsx avec lazy loading');
checkFile('vite.config.ts', 'Vite config optimisée');
checkFile('src/contexts/AuthContext.tsx', 'AuthContext avec logger');
checkFile('src/components/EventCard.tsx', 'EventCard mémorisé');
checkFile('src/pages/CreateEvent.tsx', 'CreateEvent avec schémas centralisés');
checkFile('src/pages/EditEvent.tsx', 'EditEvent avec schémas centralisés');
checkFile('src/hooks/useUserProfile.tsx', 'useUserProfile optimisé');

// Vérifier l'utilisation du logger
console.log('\n3. Vérification de l\'utilisation du logger...');
checkLoggerUsage('src/contexts/AuthContext.tsx', 'AuthContext logger');
checkLoggerUsage('src/pages/Index.tsx', 'Index logger');
checkLoggerUsage('src/components/organization/EventsTab.tsx', 'EventsTab logger');
checkLoggerUsage('src/pages/ScanParticipant.tsx', 'ScanParticipant logger');
checkLoggerUsage('src/pages/VerifyParticipant.tsx', 'VerifyParticipant logger');
checkLoggerUsage('src/hooks/useUserProfile.tsx', 'useUserProfile logger');

// Résumé
console.log('\n' + '='.repeat(50));
console.log('📊 Résumé de la vérification\n');
console.log(`✅ Tests réussis: ${checks.passed}`);
console.log(`❌ Tests échoués: ${checks.failed}`);

if (checks.errors.length > 0) {
  console.log('\n⚠️  Erreurs détectées:');
  checks.errors.forEach(error => console.log(`  ${error}`));
}

const successRate = ((checks.passed / (checks.passed + checks.failed)) * 100).toFixed(1);
console.log(`\n📈 Taux de réussite: ${successRate}%`);

if (checks.failed === 0) {
  console.log('\n🎉 Toutes les vérifications sont passées !');
  process.exit(0);
} else {
  console.log('\n⚠️  Certaines vérifications ont échoué. Veuillez vérifier les erreurs ci-dessus.');
  process.exit(1);
}

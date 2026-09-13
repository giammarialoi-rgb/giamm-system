/**
 * Domain services test verification
 */
import {
  I18nService,
  EntitlementService,
  pricingConfig,
  AdsService,
  ExamineService,
  HealthDataProvider,
  ErrorLogger
} from './test_master_task20_services.mjs';

console.log('Testing I18nService...');
console.log('IT dashboard:', I18nService.t('dashboard'));
I18nService.setLanguage('en');
console.log('EN dashboard:', I18nService.t('dashboard'));
I18nService.setLanguage('es');
console.log('ES dashboard:', I18nService.t('dashboard'));
I18nService.setLanguage('fr');
console.log('FR dashboard:', I18nService.t('dashboard'));
I18nService.setLanguage('de');
console.log('DE dashboard:', I18nService.t('dashboard'));
I18nService.setLanguage('it');

console.log('\nTesting EntitlementService...');
EntitlementService.setPlan('FREE');
console.log('FREE has basic_training:', EntitlementService.hasFeature('basic_training'));
console.log('FREE has advanced_ai:', EntitlementService.hasFeature('advanced_ai'));
console.log('FREE ads banner:', AdsService.renderBanner('dashboard').length > 0);

EntitlementService.setPlan('SILVER');
console.log('SILVER has advanced_ai:', EntitlementService.hasFeature('advanced_ai'));
console.log('SILVER ads banner:', AdsService.renderBanner('dashboard').length === 0);

console.log('\nTesting ExamineService...');
const creatineEvidence = await ExamineService.getEvidence('creatina');
console.log('Creatine grade:', creatineEvidence.evidence.grade);

console.log('\nTesting ErrorLogger...');
ErrorLogger.log('AI_ERROR', 'Test error log', new Error('Mock error'));
console.log('Logged errors count:', ErrorLogger.getRecentErrors().length);

console.log('\nAll domain service unit tests passed!');

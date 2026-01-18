import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MainNavbar } from '@/components/MainNavbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe, Check } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

type Language = 'fr' | 'en';

const TermsOfService = () => {
  const [language, setLanguage] = useState<Language>(() => {
    // Récupérer la langue depuis localStorage ou utiliser 'fr' par défaut
    const saved = localStorage.getItem('legal-page-language');
    return (saved === 'en' || saved === 'fr') ? saved : 'fr';
  });

  const setLanguageAndSave = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('legal-page-language', lang);
  };

  // Contenu en français
  const contentFr = {
    title: 'Conditions d\'Utilisation',
    lastUpdated: 'Dernière mise à jour : 18/01/2026',
    sections: [
      {
        title: '1. Acceptation des Conditions',
        paragraphs: [
          'En téléchargeant, accédant ou utilisant l\'application mobile Citizen Vitae (« l\'Application »), vous acceptez d\'être lié par les présentes Conditions d\'Utilisation (« Conditions »).',
        ],
      },
      {
        title: '2. Vérification d\'Identité via Didit (Partenaire de Confiance)',
        paragraphs: [
          'Citizen Vitae est une plateforme conçue pour certifier l\'engagement citoyen. Pour garantir l\'intégrité de cette certification, nous exigeons une vérification d\'identité stricte. En utilisant l\'Application, vous vérifiez et acceptez que :',
        ],
        bullets: [
          'Sécurité Tiers : Nous utilisons la technologie de Didit (lien vers Didit), un fournisseur tiers spécialisé et sécurisé, pour effectuer la vérification d\'identité. Didit gère le traitement de votre document d\'identité et de vos données biométriques dans un environnement hautement sécurisé et chiffré.',
          'Traitement des Données : Vous reconnaissez que vos données de vérification sont traitées par Didit en tant que prestataire de service de confiance pour assurer l\'exactitude de la détection du vivant et la lutte contre l\'usurpation.',
          'Exactitude : Vous acceptez de fournir une pièce d\'identité officielle valide et non expirée pour permettre cette vérification.',
        ],
      },
      {
        title: '3. Données Biométriques et Confidentialité',
        paragraphs: [
          'Votre vie privée est primordiale. Bien que ces Conditions régissent votre utilisation de l\'Application, la collecte et le traitement spécifiques de vos données sont régis par notre Politique de Confidentialité.',
          'Nous ne vendons pas vos données biométriques.',
          'Vous consentez explicitement au traitement de vos données faciales via notre partenaire Didit dans le seul but de la vérification d\'identité et de la prévention de la fraude.',
        ],
      },
      {
        title: '4. Éligibilité et Accès Universel',
        paragraphs: [
          'Citizen Vitae est une plateforme universelle conçue pour certifier l\'engagement de tous les citoyens, quel que soit leur âge. L\'Application est classée tout public (comparable aux classifications "Everyone" ou PEGI 3).',
        ],
        bullets: [
          'Mineurs : Si vous n\'avez pas atteint l\'âge de la majorité légale dans votre juridiction, vous confirmez avoir obtenu la permission d\'un parent ou d\'un tuteur légal pour utiliser l\'Application et soumettre des documents d\'identité.',
          'Responsabilité Parentale : Les parents ou tuteurs sont responsables de la supervision de l\'utilisation de l\'Application par les mineurs sous leur garde.',
        ],
      },
      {
        title: '5. Conduite de l\'Utilisateur et Actes Interdits',
        paragraphs: [
          'Pour maintenir la confiance de l\'écosystème Citizen Vitae, vous acceptez de NE PAS :',
        ],
        bullets: [
          'Utiliser des photographies, des enregistrements vidéo, des "deepfakes" ou des masques pour contourner la sécurité de reconnaissance faciale de Didit.',
          'Soumettre des documents d\'identité falsifiés, altérés ou volés.',
          'Faire de l\'ingénierie inverse sur l\'Application ou tenter d\'en dériver le code source.',
          'Utiliser l\'Application à des fins illégales ou pour faciliter l\'usurpation d\'identité.',
        ],
        paragraphsAfter: [
          'Toute violation de cette section entraînera la résiliation immédiate du compte.',
        ],
      },
      {
        title: '6. Propriété Intellectuelle',
        paragraphs: [
          'Tous les droits relatifs à l\'Application sont la propriété exclusive de Citizen Vitae et de ses concédants de licence (y compris les technologies spécifiques sous licence de Didit).',
        ],
      },
      {
        title: '7. Exclusion de Garanties',
        paragraphs: [
          'L\'Application est fournie « EN L\'ÉTAT ». Bien que notre partenaire Didit utilise une technologie avancée, Citizen Vitae ne garantit pas que la vérification d\'identité sera exempte d\'erreurs ou précise à 100 % en tout temps.',
        ],
      },
      {
        title: '8. Limitation de Responsabilité',
        paragraphs: [
          'Dans toute la mesure permise par la loi, Citizen Vitae ne pourra être tenu responsable de tout dommage indirect résultant de votre utilisation de l\'Application.',
        ],
      },
      {
        title: '9. Modification des Conditions',
        paragraphs: [
          'Nous nous réservons le droit de modifier ces Conditions à tout moment. L\'utilisation continue de l\'Application après de tels changements constitue une acceptation des nouvelles Conditions.',
        ],
      },
      {
        title: '10. Nous Contacter',
        paragraphs: [
          'Pour toute question, veuillez contacter : E-mail : contact@citizenvitae.com',
        ],
      },
    ]
  };

  // Contenu en anglais
  const contentEn = {
    title: 'Terms of Service',
    lastUpdated: 'Last Updated : 01/18/2026',
    sections: [
      {
        title: '1. Acceptance of Terms',
        paragraphs: [
          'By downloading, accessing, or using the Citizen Vitae mobile application ("the App"), you agree to be bound by these Terms of Use ("Terms").',
        ],
      },
      {
        title: '2. Identity Verification via Didit (Trusted Partner)',
        paragraphs: [
          'Citizen Vitae is a platform designed to certify citizen engagement. To guarantee the integrity of this certification, we require strict identity verification. By using the App, you verify and agree that:',
        ],
        bullets: [
          'Third-Party Security: We utilize the technology of Didit (ajoute ici le lien vers la page Didit), a specialized and secure third-party provider, to perform identity verification. Didit handles the processing of your ID document and biometric data within a highly secure, encrypted environment.',
          'Data Processing: You acknowledge that your verification data is processed by Didit as a trusted service provider to ensure anti-spoofing and liveness detection accuracy.',
          'Accuracy: You agree to provide valid, unexpired government-issued identification to enable this verification.',
        ],
      },
      {
        title: '3. Biometric Data & Privacy',
        paragraphs: [
          'Your privacy is paramount. While these Terms govern your use of the App, the specific collection and processing of your data are governed by our Privacy Policy.',
          'We do not sell your biometric data.',
          'You explicitly consent to the processing of your facial data via our partner Didit for the sole purpose of identity verification and fraud prevention.',
        ],
      },
      {
        title: '4. Eligibility & Universal Access',
        paragraphs: [
          'Citizen Vitae is a universal platform designed to certify the engagement of all citizens, regardless of age. The App is rated for a general audience (comparable to "Everyone" or PEGI 3 ratings).',
        ],
        bullets: [
          'Minors: If you are under the age of legal majority in your jurisdiction, you confirm that you have obtained permission from a parent or legal guardian to use the App and submit identity documents.',
          'Parental Responsibility: Parents or guardians are responsible for supervising the use of the App by minors under their care.',
        ],
      },
      {
        title: '5. User Conduct & Prohibited Acts',
        paragraphs: [
          'To maintain the trust of the Citizen Vitae ecosystem, you agree NOT to:',
        ],
        bullets: [
          'Use photographs, video recordings, deepfakes, or masks to bypass Didit\'s facial recognition security.',
          'Submit forged, altered, or stolen identification documents.',
          'Reverse engineer the App or attempt to derive the source code.',
          'Use the App for any illegal purpose or to facilitate identity theft.',
        ],
        paragraphsAfter: [
          'Violation of this section will result in immediate account termination.',
        ],
      },
      {
        title: '6. Intellectual Property',
        paragraphs: [
          'All rights, titles, and interests in and to the App are the exclusive property of Citizen Vitae and its licensors (including specific technologies licensed from Didit).',
        ],
      },
      {
        title: '7. Disclaimer of Warranties',
        paragraphs: [
          'The App is provided on an "AS IS" basis. While our partner Didit utilizes advanced technology, Citizen Vitae does not guarantee that the identity verification will be error-free or 100% accurate at all times.',
        ],
      },
      {
        title: '8. Limitation of Liability',
        paragraphs: [
          'To the maximum extent permitted by law, Citizen Vitae shall not be liable for any indirect damages resulting from your use of the App.',
        ],
      },
      {
        title: '9. Changes to Terms',
        paragraphs: [
          'We reserve the right to modify these Terms at any time. Continued use of the App after such changes constitutes acceptance of the new Terms.',
        ],
      },
      {
        title: '10. Contact Us',
        paragraphs: [
          'For any questions regarding these Terms, please contact: Email: contact@citizenvitae.com',
        ],
      },
    ]
  };

  const content = language === 'fr' ? contentFr : contentEn;

  return (
    <>
      <Helmet>
        <title>{content.title} - Citizen Vitae</title>
        <meta name="description" content={content.title} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <MainNavbar />

        <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
          {/* Header avec switcher de langue */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                {content.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {content.lastUpdated}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Globe className="h-4 w-4" />
                  {language === 'fr' ? 'Français' : 'English'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguageAndSave('fr')}>
                  <span className="flex items-center gap-2 w-full">
                    Français
                    {language === 'fr' && <Check className="h-4 w-4 ml-auto" />}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguageAndSave('en')}>
                  <span className="flex items-center gap-2 w-full">
                    English
                    {language === 'en' && <Check className="h-4 w-4 ml-auto" />}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Contenu */}
          <Card>
            <CardContent className="p-6">
              <div className="prose prose-slate max-w-none dark:prose-invert">
                {/* Sections */}
                {content.sections.map((section, index) => (
                  <div key={index} className="mb-8 last:mb-0">
                    <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4">
                      {section.title}
                    </h2>
                    
                    {/* Paragraphes avant les bullet points */}
                    {section.paragraphs && section.paragraphs.map((para, pIndex) => {
                      // Remplacer le lien vers Privacy Policy si présent
                      const hasPrivacyLink = para.includes('Politique de Confidentialité') || para.includes('Privacy Policy');
                      if (hasPrivacyLink) {
                        const parts = para.split(/Politique de Confidentialité|Privacy Policy/);
                        return (
                          <p key={pIndex} className="text-base text-muted-foreground leading-relaxed mb-4">
                            {parts[0]}
                            <Link to="/privacy" className="text-primary hover:underline">
                              {language === 'fr' ? 'Politique de Confidentialité' : 'Privacy Policy'}
                            </Link>
                            {parts[1]}
                          </p>
                        );
                      }
                      return (
                        <p key={pIndex} className="text-base text-muted-foreground leading-relaxed mb-4">
                          {para}
                        </p>
                      );
                    })}
                    
                    {/* Bullet points */}
                    {section.bullets && (
                      <ul className="list-none space-y-2 mb-4 ml-0">
                        {section.bullets.map((bullet, bIndex) => {
                          // Remplacer le lien vers Didit si présent (pour EN et FR)
                          const hasDiditLinkEn = bullet.includes('Didit') && bullet.includes('ajoute ici le lien');
                          const hasDiditLinkFr = bullet.includes('Didit') && bullet.includes('lien vers Didit');
                          
                          if (hasDiditLinkEn) {
                            // Version anglaise : remplacer "Didit (ajoute ici le lien vers la page Didit)" par un lien "Didit"
                            const parts = bullet.split(/Didit\s*\(ajoute ici le lien vers la page Didit\)/);
                            return (
                              <li key={bIndex} className="text-base text-muted-foreground leading-relaxed flex items-start">
                                <span className="mr-2 text-foreground">●</span>
                                <span>
                                  {parts[0]}
                                  <a href="https://didit.me" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    Didit
                                  </a>
                                  {parts[1]}
                                </span>
                              </li>
                            );
                          }
                          
                          if (hasDiditLinkFr) {
                            // Version française : remplacer "Didit (lien vers Didit)" par un lien "Didit"
                            const parts = bullet.split(/Didit\s*\(lien vers Didit\)/);
                            return (
                              <li key={bIndex} className="text-base text-muted-foreground leading-relaxed flex items-start">
                                <span className="mr-2 text-foreground">●</span>
                                <span>
                                  {parts[0]}
                                  <a href="https://didit.me" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    Didit
                                  </a>
                                  {parts[1]}
                                </span>
                              </li>
                            );
                          }
                          
                          return (
                            <li key={bIndex} className="text-base text-muted-foreground leading-relaxed flex items-start">
                              <span className="mr-2 text-foreground">●</span>
                              <span>{bullet}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    
                    {/* Paragraphes après les bullet points */}
                    {section.paragraphsAfter && section.paragraphsAfter.map((para, pIndex) => (
                      <p key={pIndex} className="text-base text-muted-foreground leading-relaxed mb-4">
                        {para}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>

        <MobileBottomNav />

        {/* Bottom padding for mobile nav */}
        <div className="h-16 md:hidden" />
      </div>
    </>
  );
};

export default TermsOfService;

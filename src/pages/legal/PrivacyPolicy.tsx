import { useState, useEffect } from 'react';
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

const PrivacyPolicy = () => {
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
    title: 'Politique de Confidentialité',
    lastUpdated: 'Date de la dernière mise à jour : 18/01/2026',
    introduction: 'La présente politique de confidentialité vous informe sur la manière dont les données à caractère personnel vous concernant (les "Données Personnelles") sont collectées, traitées et stockées par Citizen Vitae, société par actions simplifiée enregistrée sous le numéro 982 062 960, dont le siège social est situé à 15 RUE ROUGET DE LISLE 92400 COURBEVOIE, en sa qualité de responsable du traitement. Citizen Vitae s\'engage à respecter votre vie privée et à traiter vos Données Personnelles en conformité avec le Règlement (UE) 2016/679 du Parlement européen et du Conseil du 27 avril 2016 (le "RGPD"), ainsi que les lois nationales applicables en matière de protection des données personnelles.',
    sections: [
      {
        title: '1. Données collectées, finalités et bases juridiques',
        paragraphs: [
          'Dans le cadre de l\'exploitation de notre application mobile et de notre plateforme web, nous collectons différentes catégories de Données Personnelles :',
        ],
        bullets: [
          'Identité et contact : Nom, prénom, adresse e-mail, numéro de téléphone.',
          'Données d\'engagement citoyen : Historique des missions, heures d\'engagement, certifications obtenues.',
          'Données de localisation : Données GPS pour certifier la présence sur le terrain lors des missions.',
          'Données de connexion : Adresse IP, identifiants de connexion, informations techniques.',
          'Données liées à l\'usage de la plateforme : Pages visitées, interactions avec les fonctionnalités de l\'application.',
        ],
        paragraphsAfter: [
          '1.1 Mention Spécifique : Données Biométriques et Vérification d\'Identité (Via Didit) Pour certifier votre identité et prévenir la fraude, nous collectons des données spécifiques via notre partenaire Didit :',
        ],
        bulletsAfter: [
          'Données Biométriques : Géométrie faciale et données de détection de vivacité dérivées de la vidéo/photo que vous soumettez.',
          'Données du Document d\'Identité : Informations extraites de votre pièce d\'identité officielle.',
          'Finalité : Ces données sont strictement utilisées à des fins de vérification d\'identité et de lutte contre l\'usurpation. Elles sont traitées de manière sécurisée par Didit et ne sont utilisées à aucune autre fin.',
        ],
        paragraphsAfter2: [
          'Ces données sont traitées pour les finalités suivantes :',
        ],
        bulletsAfter2: [
          'Certification des missions citoyennes : Valider la présence des utilisateurs sur le terrain grâce à un processus sécurisé.',
          'Vérification d\'Identité : S\'assurer que l\'utilisateur est une personne réelle et correspond à son document d\'identité (via Didit).',
          'Suivi de l\'engagement : Fournir aux utilisateurs et aux entreprises des rapports d\'engagement citoyen, notamment dans le cadre des politiques RSE.',
          'Amélioration de l\'expérience utilisateur : Analyser l\'utilisation de la plateforme pour améliorer les services offerts.',
          'Communication : Répondre à vos demandes de contact et envoyer des informations relatives aux services.',
        ],
      },
      {
        title: '2. Destinataires des Données Personnelles',
        paragraphs: [
          'Les Données Personnelles collectées sont exclusivement destinées à Citizen Vitae et à ses sous-traitants agissant pour son compte. Nous ne partageons vos données avec des tiers qu\'aux conditions suivantes :',
        ],
        bullets: [
          'Avec votre consentement explicite : Lorsque vous partagez vos informations avec des associations ou entreprises partenaires.',
          'Prestataires de services : Pour des raisons techniques, nous pouvons recourir à des prestataires (hébergement, maintenance) qui traiteront vos données selon nos instructions.',
          'Obligations légales : Vos données peuvent être divulguées si requis par la loi ou pour protéger nos droits.',
        ],
      },
      {
        title: '3. Conservation des Données',
        paragraphs: [
          'Nous conservons vos Données Personnelles pour la durée nécessaire à l\'accomplissement des finalités pour lesquelles elles ont été collectées :',
        ],
        bullets: [
          'Données relatives à l\'engagement citoyen : Conservées tant que votre compte est actif ou que vous en faites usage.',
          'Données techniques : Conservées pour la durée légale requise à des fins de sécurité et de traçabilité.',
        ],
        paragraphsAfter: [
          'Certaines données peuvent être conservées au-delà, dans le cadre d\'obligations légales (notamment fiscales) ou pour la gestion de contentieux.',
        ],
      },
      {
        title: '4. Sécurité des Données',
        paragraphs: [
          'Citizen Vitae prend des mesures techniques et organisationnelles pour garantir la sécurité de vos Données Personnelles contre l\'accès non autorisé, la divulgation, l\'altération ou la destruction. Nous utilisons le chiffrement des données, des pare-feux, ainsi que des audits de sécurité réguliers.',
        ],
      },
      {
        title: '5. Vos droits',
        paragraphs: [
          'Conformément à la Réglementation Applicable, vous disposez des droits suivants concernant vos Données Personnelles :',
        ],
        bullets: [
          'Droit d\'accès : Vous pouvez obtenir des informations sur les données que nous détenons à votre sujet.',
          'Droit de rectification : Vous pouvez demander la correction de vos données inexactes.',
          'Droit à l\'effacement : Vous pouvez demander la suppression de vos données dans certaines conditions.',
          'Droit à la limitation : Vous pouvez demander la suspension temporaire du traitement de vos données.',
          'Droit à la portabilité : Vous pouvez demander une copie de vos données dans un format structuré et lisible.',
        ],
        paragraphsAfter: [
          'Pour exercer ces droits, contactez-nous à l\'adresse suivante : contact@citizenvitae.com',
        ],
      },
      {
        title: '6. Cookies',
        paragraphs: [
          'Citizen Vitae utilise des cookies pour optimiser l\'expérience utilisateur et analyser l\'usage de la plateforme. Vous pouvez configurer votre navigateur pour refuser les cookies ou être averti avant leur installation.',
        ],
      },
      {
        title: '7. Modifications de la Politique de Confidentialité',
        paragraphs: [
          'Citizen Vitae se réserve le droit de modifier cette politique à tout moment pour refléter les changements législatifs ou l\'évolution de nos services. En cas de modifications substantielles, nous vous en informerons par e-mail ou via notre application.',
        ],
      },
      {
        title: '8. Acceptation et mise à jour de la Politique de Confidentialité',
        paragraphs: [
          'En cochant la case « J\'ai lu et j\'accepte la Politique de Confidentialité » lors de la création de votre compte utilisateur sur l\'application mobile ou la plateforme Web Citizen Vitae, vous confirmez avoir pris connaissance de la Politique de Confidentialité et l\'accepter sans réserve.',
          'Si vous êtes en désaccord avec l\'un de ses termes, vous êtes libre de ne pas utiliser la plateforme ou de cesser son utilisation à tout moment, notamment en cas de modification des termes de cette Politique.',
          'Citizen Vitae se réserve le droit de modifier la Politique de Confidentialité à tout moment. Toute nouvelle version sera publiée et rendue accessible via la plateforme, et vous en serez informé par email ou lors de votre prochaine connexion.',
          'La Politique de Confidentialité est toujours consultable sur les différentes pages de notre plateforme, pour une transparence totale sur l\'utilisation de vos données.',
        ],
      },
      {
        title: '9. Identité du Délégué à la Protection des Données',
        paragraphs: [
          'Le Délégué à la Protection des Données désigné par Citizen Vitae est Harry Benkemoun, dont les coordonnées sont les suivantes :',
        ],
        bullets: [
          'Harry Benkemoun',
          '6 rue André Del Sarte, 75018 Paris',
          'dpo@citizenvitae.com',
        ],
      },
    ]
  };

  // Contenu en anglais
  const contentEn = {
    title: 'Privacy Policy',
    lastUpdated: 'Last Updated: January 18, 2026',
    introduction: 'This Privacy Policy informs you about how your personal data ("Personal Data") is collected, processed, and stored by Citizen Vitae, a simplified joint-stock company (société par actions simplifiée) registered under number 982 062 960, with its registered office located at 15 RUE ROUGET DE LISLE, 92400 COURBEVOIE, FRANCE, acting as the Data Controller. Citizen Vitae is committed to respecting your privacy and processing your Personal Data in compliance with Regulation (EU) 2016/679 of the European Parliament and of the Council of April 27, 2016 (the "GDPR"), as well as applicable national data protection laws.',
    sections: [
      {
        title: '1. Collected Data, Purposes, and Legal Bases',
        paragraphs: [
          'In the context of operating our mobile application and web platform, we collect different categories of Personal Data:',
        ],
        bullets: [
          'Identity and Contact: Last name, first name, email address, phone number.',
          'Citizen Engagement Data: History of missions, engagement hours, certifications obtained.',
          'Location Data: GPS data to certify presence on the field during missions.',
          'Connection Data: IP address, login credentials, technical information.',
          'Platform Usage Data: Pages visited, interactions with application features.',
        ],
        paragraphsAfter: [
          '1.1 Specific Mention: Biometric Data & Identity Verification (Via Didit) To certify your identity and prevent fraud, we collect specific data through our partner Didit:',
        ],
        bulletsAfter: [
          'Biometric Data: Facial geometry and liveness detection data derived from the video/photo you submit.',
          'ID Document Data: Information extracted from your government-issued ID.',
          'Purpose: This data is strictly used for identity verification and anti-spoofing purposes. It is processed securely by Didit and is not used for any other purpose.',
        ],
        paragraphsAfter2: [
          'These data are processed for the following purposes:',
        ],
        bulletsAfter2: [
          'Certification of Citizen Missions: Validating user presence on the field through a secure process.',
          'Identity Verification: Ensuring the user is a real person and matches their ID document (via Didit).',
          'Engagement Monitoring: Providing users and companies with citizen engagement reports, particularly within the framework of CSR policies.',
          'Improving User Experience: Analyzing platform usage to improve the services offered.',
          'Communication: Responding to your contact requests and sending service-related information.',
        ],
      },
      {
        title: '2. Recipients of Personal Data',
        paragraphs: [
          'The Personal Data collected is exclusively intended for Citizen Vitae and its subcontractors (processors) acting on its behalf. We only share your data with third parties under the following conditions:',
        ],
        bullets: [
          'With Your Explicit Consent: When you share your information with partner associations or companies.',
          'Service Providers: For technical reasons, we may use service providers (hosting, maintenance, identity verification via Didit) who will process your data according to our instructions.',
          'Legal Obligations: Your data may be disclosed if required by law or to protect our rights.',
        ],
      },
      {
        title: '3. Data Retention',
        paragraphs: [
          'We retain your Personal Data for the period necessary to fulfill the purposes for which it was collected:',
        ],
        bullets: [
          'Citizen Engagement Data: Retained as long as your account is active or as long as you use it.',
          'Technical Data: Retained for the legal duration required for security and traceability purposes.',
          'Biometric Data: Retained only for the time necessary to perform the verification process, after which it is permanently deleted or anonymized by our partner Didit, in accordance with their strict retention policy.',
        ],
        paragraphsAfter: [
          'Some data may be retained beyond this period to comply with legal obligations (specifically tax obligations) or for litigation management.',
        ],
      },
      {
        title: '4. Data Security',
        paragraphs: [
          'Citizen Vitae implements technical and organizational measures to guarantee the security of your Personal Data against unauthorized access, disclosure, alteration, or destruction. We use data encryption, firewalls, and regular security audits.',
        ],
      },
      {
        title: '5. Your Rights',
        paragraphs: [
          'In accordance with Applicable Regulations, you have the following rights regarding your Personal Data:',
        ],
        bullets: [
          'Right of Access: You can obtain information about the data we hold about you.',
          'Right to Rectification: You can request the correction of inaccurate data.',
          'Right to Erasure ("Right to be Forgotten"): You can request the deletion of your data under certain conditions.',
          'Right to Restriction: You can request the temporary suspension of your data processing.',
          'Right to Portability: You can request a copy of your data in a structured and machine-readable format.',
        ],
        paragraphsAfter: [
          'To exercise these rights, please contact us at the following address: contact@citizenvitae.com',
        ],
      },
      {
        title: '6. Cookies',
        paragraphs: [
          'Citizen Vitae uses cookies to optimize the user experience and analyze platform usage. You can configure your browser to refuse cookies or to be alerted before they are installed.',
        ],
      },
      {
        title: '7. Changes to the Privacy Policy',
        paragraphs: [
          'Citizen Vitae reserves the right to modify this policy at any time to reflect legislative changes or the evolution of our services. In the event of substantial changes, we will inform you by email or via our application.',
        ],
      },
      {
        title: '8. Acceptance and Update of the Privacy Policy',
        paragraphs: [
          'By checking the box "I have read and accept the Privacy Policy" during the creation of your user account on the Citizen Vitae mobile application or web platform, you confirm that you have read the Privacy Policy and accept it without reservation.',
          'If you disagree with any of its terms, you are free not to use the platform or to cease its use at any time, particularly in the event of a modification to the terms of this Policy.',
          'Citizen Vitae reserves the right to modify the Privacy Policy at any time. Any new version will be published and made accessible via the platform, and you will be informed by email or during your next login.',
          'The Privacy Policy is always available for consultation on the various pages of our platform, ensuring total transparency regarding the use of your data.',
        ],
      },
      {
        title: '9. Identity of the Data Protection Officer (DPO)',
        paragraphs: [
          'The Data Protection Officer appointed by Citizen Vitae is Harry Benkemoun, whose contact details are as follows:',
        ],
        bullets: [
          'Harry Benkemoun',
          '6 rue André Del Sarte, 75018 Paris',
          'Email: dpo@citizenvitae.com',
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
                {/* Introduction */}
                {content.introduction && (
                  <div className="mb-8">
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {content.introduction}
                    </p>
                  </div>
                )}
                
                {/* Sections */}
                {content.sections.map((section, index) => (
                  <div key={index} className="mb-8 last:mb-0">
                    <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4">
                      {section.title}
                    </h2>
                    
                    {/* Paragraphes avant les bullet points */}
                    {section.paragraphs && section.paragraphs.map((para, pIndex) => (
                      <p key={pIndex} className="text-base text-muted-foreground leading-relaxed mb-4">
                        {para}
                      </p>
                    ))}
                    
                    {/* Bullet points */}
                    {section.bullets && (
                      <ul className="list-none space-y-2 mb-4 ml-0">
                        {section.bullets.map((bullet, bIndex) => (
                          <li key={bIndex} className="text-base text-muted-foreground leading-relaxed flex items-start">
                            <span className="mr-2 text-foreground">●</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    
                    {/* Paragraphes après les bullet points */}
                    {section.paragraphsAfter && section.paragraphsAfter.map((para, pIndex) => {
                      // Mettre en évidence la mention spécifique Didit
                      const isDiditMention = para.includes('1.1') || para.includes('Mention Spécifique') || para.includes('Specific Mention');
                      return (
                        <p key={pIndex} className={`text-base leading-relaxed mb-4 ${isDiditMention ? 'text-foreground font-semibold mt-6' : 'text-muted-foreground'}`}>
                          {para}
                        </p>
                      );
                    })}
                    
                    {/* Bullet points après les paragraphes */}
                    {'bulletsAfter' in section && section.bulletsAfter && Array.isArray(section.bulletsAfter) && (
                      <ul className="list-none space-y-2 mb-4 ml-0">
                        {section.bulletsAfter.map((bullet, bIndex) => (
                          <li key={bIndex} className="text-base text-muted-foreground leading-relaxed flex items-start">
                            <span className="mr-2 text-foreground">●</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    
                    {/* Paragraphes après les bullet points (niveau 2) */}
                    {'paragraphsAfter2' in section && section.paragraphsAfter2 && Array.isArray(section.paragraphsAfter2) && (
                      <>
                        {section.paragraphsAfter2.map((para, pIndex) => (
                          <p key={pIndex} className="text-base text-muted-foreground leading-relaxed mb-4 font-semibold">
                            {para}
                          </p>
                        ))}
                      </>
                    )}
                    
                    {/* Bullet points après les paragraphes (niveau 2) */}
                    {'bulletsAfter2' in section && section.bulletsAfter2 && Array.isArray(section.bulletsAfter2) && (
                      <ul className="list-none space-y-2 mb-4 ml-0">
                        {section.bulletsAfter2.map((bullet, bIndex) => (
                          <li key={bIndex} className="text-base text-muted-foreground leading-relaxed flex items-start">
                            <span className="mr-2 text-foreground">●</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
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

export default PrivacyPolicy;

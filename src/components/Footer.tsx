import { Link } from 'react-router-dom';
import { Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import logoDarkmode from '@/assets/logo-darkmode.svg';

export const Footer = () => {
  return (
    <footer className="bg-[#171717] text-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo et description */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="inline-block mb-4">
              <img src={logoDarkmode} alt="Citizen Vitae" className="h-8 w-auto" />
            </Link>
            <p className="text-gray-400 text-sm max-w-md">
              Citizen Vitae est la plateforme qui certifie et valorise votre engagement citoyen. 
              Rejoignez une communauté engagée et faites reconnaître vos actions.
            </p>
          </div>

          {/* Liens légaux */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Légal</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/terms" 
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Conditions d'utilisation
                </Link>
              </li>
              <li>
                <Link 
                  to="/privacy" 
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Politique de confidentialité
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Contact</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="mailto:contact@citizenvitae.com" 
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  contact@citizenvitae.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Séparateur */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Réseaux sociaux */}
            <div className="flex items-center gap-4">
              <a
                href="https://www.facebook.com/citizenvitae"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/citizenvitae"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.linkedin.com/company/citizen-vitae/?viewAsMember=true"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com/citizenvitae"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="X (Twitter)"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>

            {/* Copyright */}
            <p className="text-gray-500 text-sm text-center md:text-right">
              © {new Date().getFullYear()} Citizen Vitae. Tous droits réservés.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

import Svg, { Path } from 'react-native-svg';

const RED = '#E23428';
const BLUE = '#012573';

type Props = {
  /** Taille du carré d’affichage (le sigle garde ses proportions). */
  size?: number;
};

/**
 * Sigle graphique Citizen Vitae (partie gauche du logo), pour pastilles et badges.
 * Aligné sur `assets/certificate/logo-czv.svg`.
 */
export function CitizenVitaeSigil({ size = 16 }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 49"
      accessibilityIgnoresInvertColors
      accessibilityRole="image"
      accessibilityLabel="Citizen Vitae"
    >
      <Path
        fill={BLUE}
        d="M37.9928 9.95997L20.9348 0L0 12.1668V36.3524L21.1137 48.5493L39.5135 37.7538L34.5335 34.8313L20.9348 42.7639L4.9504 33.4896V15.0597L21.1137 5.78493L35.3384 14.0754L37.9928 9.95997Z"
      />
      <Path
        fill={RED}
        d="M7.93262 24.4534L15.6266 12.853L19.2348 15.2086L24.8413 29.4038L42.4361 2.95215L46.0743 5.36747L25.1395 36.9785L22.1277 35.0103L16.2827 19.9505L11.6606 26.8692L7.93262 24.4534Z"
      />
    </Svg>
  );
}

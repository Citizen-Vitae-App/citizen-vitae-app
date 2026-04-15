import { motion } from 'framer-motion';

/**
 * Branded loading animation using the Citizen Vitae sigil.
 * The C shape draws in, then the V "signs" inside like a validation mark.
 */
export function BrandedLoader({ size = 48 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      initial={{ opacity: 1, scale: 1 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Background circle */}
      <motion.circle
        cx="24"
        cy="24"
        r="24"
        fill="#FFFDF8"
      />

      {/* C shape — draws in via stroke */}
      <motion.path
        d="M35.0528 13.3069L22.3104 5.8667L6.67188 14.9554V33.0222L22.444 42.1334L36.1888 34.0691L32.4687 31.8859L22.3104 37.8116L10.3699 30.8836V17.1164L22.444 10.1881L33.07 16.3811L35.0528 13.3069Z"
        stroke="#012573"
        strokeWidth="1.2"
        fill="#012573"
        initial={{ pathLength: 0, fillOpacity: 0 }}
        animate={{ pathLength: 1, fillOpacity: 1 }}
        transition={{
          pathLength: { duration: 0.8, ease: 'easeInOut' },
          fillOpacity: { duration: 0.3, delay: 0.6, ease: 'easeIn' },
        }}
      />

      {/* V shape — sweeps in like a signature after C is drawn */}
      <motion.path
        d="M12.5898 24.1336L18.3373 15.468L21.0327 17.2277L25.2208 27.8316L38.3642 8.07202L41.082 9.87628L25.4435 33.49L23.1937 32.0197L18.8274 20.7699L15.3747 25.9382L12.5898 24.1336Z"
        stroke="#E23428"
        strokeWidth="1.2"
        fill="#E23428"
        initial={{ pathLength: 0, fillOpacity: 0 }}
        animate={{ pathLength: 1, fillOpacity: 1 }}
        transition={{
          pathLength: { duration: 0.6, ease: 'easeInOut', delay: 0.7 },
          fillOpacity: { duration: 0.25, delay: 1.1, ease: 'easeIn' },
        }}
      />

      {/* Subtle pulse ring after full reveal */}
      <motion.circle
        cx="24"
        cy="24"
        r="23"
        stroke="#012573"
        strokeWidth="0.5"
        fill="none"
        initial={{ opacity: 0, scale: 1 }}
        animate={{ opacity: [0, 0.4, 0], scale: [1, 1.15, 1.3] }}
        transition={{
          duration: 1.2,
          delay: 1.3,
          repeat: Infinity,
          repeatDelay: 0.8,
          ease: 'easeOut',
        }}
      />
    </motion.svg>
  );
}

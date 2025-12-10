// src/components/homepage/FloatingCarWrapper.tsx
'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface FloatingCarWrapperProps {
  children: ReactNode;
}

export default function FloatingCarWrapper({ children }: FloatingCarWrapperProps) {
  return (
    <div className="relative">
      {/* Floating Toyota car image - positioned to overlap both sections */}
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="pointer-events-none absolute left-0 top-1/2 z-20 hidden -translate-y-1/2 lg:block"
        style={{ marginTop: '-40px' }}
      >
        <Image
          src="/toyota_ariel_view.png"
          alt="Toyota aerial view"
          width={500}
          height={350}
          className="w-[380px] object-contain drop-shadow-2xl xl:w-[450px] 2xl:w-[500px]"
        />
      </motion.div>

      {children}
    </div>
  );
}

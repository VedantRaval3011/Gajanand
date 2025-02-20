"use client";
import { Calistoga } from "next/font/google";

const calistoga = Calistoga({
  weight: '400',
  subsets: ['latin'],
});

const GoldenText = ({ text = "Golden Shine" }) => {
  return (
    <div className="w-full flex justify-center items-center">
      <h1
        className={`${calistoga.className} font-bold animate-pulse`}
        style={{
          background: 'linear-gradient(to right, #462523 0%, #cb9b51 22%, #f6e27a 45%, #f6f2c0 50%, #f6e27a 55%, #cb9b51 78%, #462523 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundSize: '200% auto',
          animation: 'shine 4s linear infinite',
          fontSize: 'clamp(1.5rem, 8vw, 4rem)', // Responsive font size
        }}
      >
        {text}
        <style jsx>{`
          @keyframes shine {
            to {
              background-position: 200% center;
            }
          }

          /* Responsive adjustments */
          @media (max-width: 640px) {
            h1 {
              font-size: 2rem; /* Smaller font size for mobile */
            }
          }

          @media (min-width: 1920px) {
            h1 {
              font-size: 6rem; /* Larger font size for ultra-wide screens */
            }
          }
        `}</style>
      </h1>
    </div>
  );
};

export default GoldenText;
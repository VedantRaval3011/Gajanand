"use client";
import { Calistoga } from "next/font/google";

const calistoga = Calistoga({
  weight: '400',
  subsets: ['latin'],
})
 
const GoldenText = ({ text = "Golden Shine" }) => {
  return (
    <div className="w-full">
      <h1 
        className={`${calistoga.className} text-6xl font-bold  animate-pulse`}
        style={{
          background: 'linear-gradient(to right, #462523 0%, #cb9b51 22%, #f6e27a 45%, #f6f2c0 50%, #f6e27a 55%, #cb9b51 78%, #462523 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundSize: '200% auto',
          animation: 'shine 4s linear infinite',
          fontSize: '5rem'
        }}
      >
        {text}
        <style jsx>{`
          @keyframes shine {
            to {
              background-position: 200% center;
            }
          }
        `}</style>
      </h1>
    </div>
  );
};

export default GoldenText;
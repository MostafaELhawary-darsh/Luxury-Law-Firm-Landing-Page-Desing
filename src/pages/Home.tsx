import React, { Suspense, lazy } from 'react';
const Hero = lazy(() => import('./Hero'));
const Services = lazy(() => import('./Services'));
const Team = lazy(() => import('./Team'));
const ContactForm = lazy(() => import('./ContactForm'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={<LoadingSpinner />}>
        <Hero />
      </Suspense>
      
      <Suspense fallback={<LoadingSpinner />}>
        <Services />
      </Suspense>
      
      <Suspense fallback={<LoadingSpinner />}>
        <Team />
      </Suspense>
      
      <Suspense fallback={<LoadingSpinner />}>
        <ContactForm />
      </Suspense>
    </div>
  );
};

export default Home;
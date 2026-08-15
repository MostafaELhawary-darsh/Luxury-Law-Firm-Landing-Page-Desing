import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Trust from '@/components/Trust';
import PracticeAreas from '@/components/PracticeAreas';
import Philosophy from '@/components/Philosophy';
import FinalCTA from '@/components/FinalCTA';
import Footer from '@/components/Footer';
import ContactModal from '@/components/ContactModal';
import LibraryPage from '@/components/library/LibraryPage';
import FinancePage from '@/components/finance/FinancePage';
import FirmManagement from '@/components/firm/FirmManagement';
import { VoiceProvider, useVoice } from '@/lib/voiceContext';
import VoiceButton from '@/components/voice/VoiceButton';
import VoiceModals from '@/components/voice/VoiceModals';
import type { Section, FirmModuleId } from '@/lib/voiceTypes';

function AppInner() {
  const [contactOpen, setContactOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [firmOpen, setFirmOpen] = useState(false);

  const { registerSectionNav, registerFirmModuleNav, pendingAdd, consumePendingAdd } = useVoice();

  const goToSection = useCallback((s: Section) => {
    if (s === 'site') {
      setLibraryOpen(false);
      setFinanceOpen(false);
      setFirmOpen(false);
    } else if (s === 'library') {
      setLibraryOpen(true);
      setFinanceOpen(false);
      setFirmOpen(false);
    } else if (s === 'finance') {
      setFinanceOpen(true);
      setLibraryOpen(false);
      setFirmOpen(false);
    } else if (s === 'firm') {
      setFirmOpen(true);
      setLibraryOpen(false);
      setFinanceOpen(false);
    }
  }, []);

  const goToFirmModule = useCallback((_m: FirmModuleId) => {
    setFirmOpen(true);
    setLibraryOpen(false);
    setFinanceOpen(false);
  }, []);

  useEffect(() => {
    registerSectionNav(goToSection);
  }, [registerSectionNav, goToSection]);

  useEffect(() => {
    registerFirmModuleNav(goToFirmModule);
  }, [registerFirmModuleNav, goToFirmModule]);



  if (libraryOpen) {
    return (
      <>
        <LibraryPage onBackToSite={() => setLibraryOpen(false)} />
        <VoiceButton />
        <VoiceModals />
      </>
    );
  }

  if (financeOpen) {
    return (
      <>
        <FinancePage onBackToSite={() => setFinanceOpen(false)} pendingAdd={pendingAdd} consumePendingAdd={consumePendingAdd} />
        <VoiceButton />
        <VoiceModals />
      </>
    );
  }

  if (firmOpen) {
    return (
      <>
        <FirmManagement onBackToSite={() => setFirmOpen(false)} pendingAdd={pendingAdd} consumePendingAdd={consumePendingAdd} />
        <VoiceButton />
        <VoiceModals />
      </>
    );
  }

  return (
    <div className="bg-midnight min-h-screen">
      <Navbar
        onContactClick={() => setContactOpen(true)}
        onLibraryClick={() => setLibraryOpen(true)}
        onFinanceClick={() => setFinanceOpen(true)}
        onFirmClick={() => setFirmOpen(true)}
      />
      <main>
        <Hero onContactClick={() => setContactOpen(true)} />
        <Trust />
        <PracticeAreas />
        <Philosophy />
        <FinalCTA onContactClick={() => setContactOpen(true)} />
      </main>
      <Footer
        onLibraryClick={() => setLibraryOpen(true)}
        onFinanceClick={() => setFinanceOpen(true)}
        onFirmClick={() => setFirmOpen(true)}
      />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
      <VoiceButton />
      <VoiceModals />
    </div>
  );
}

function App() {
  return (
    <VoiceProvider>
      <AppInner />
    </VoiceProvider>
  );
}

export default App;

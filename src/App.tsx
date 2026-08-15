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
import DocumentEditor from '@/components/firm/DocumentEditor';
import { VoiceProvider, useVoice } from '@/lib/voiceContext';
import VoiceButton from '@/components/voice/VoiceButton';
import VoiceModals from '@/components/voice/VoiceModals';
import type { Section, FirmModuleId } from '@/lib/voiceTypes';

function AppInner() {
  const [contactOpen, setContactOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [firmOpen, setFirmOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [firmModule, setFirmModule] = useState<FirmModuleId | null>(null);

  const { registerSectionNav, registerFirmModuleNav, pendingAdd, consumePendingAdd } = useVoice();

  const goToSection = useCallback((s: Section) => {
    if (s === 'site') {
      setLibraryOpen(false);
      setFinanceOpen(false);
      setFirmOpen(false);
      setEditorOpen(false);
    } else if (s === 'library') {
      setLibraryOpen(true);
      setFinanceOpen(false);
      setFirmOpen(false);
      setEditorOpen(false);
    } else if (s === 'finance') {
      setFinanceOpen(true);
      setLibraryOpen(false);
      setFirmOpen(false);
      setEditorOpen(false);
    } else if (s === 'firm') {
      setFirmOpen(true);
      setLibraryOpen(false);
      setFinanceOpen(false);
      setEditorOpen(false);
    } else if (s === 'editor') {
      setEditorOpen(true);
      setFirmOpen(false);
      setLibraryOpen(false);
      setFinanceOpen(false);
    }
  }, []);

  const goToFirmModule = useCallback((m: FirmModuleId) => {
    setFirmModule(m);
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

  if (editorOpen) {
    return (
      <>
        <div className="fixed inset-0 z-50">
          <DocumentEditor />
        </div>
        <button
          onClick={() => setEditorOpen(false)}
          className="fixed top-3 left-3 z-[60] px-3 py-1.5 rounded-lg bg-midnight/80 text-cream text-xs font-body hover:bg-midnight transition-colors backdrop-blur-sm"
        >
          العودة للموقع
        </button>
        <VoiceButton />
      </>
    );
  }

  if (firmOpen) {
    return (
      <>
        <FirmManagement onBackToSite={() => setFirmOpen(false)} initialModule={firmModule} pendingAdd={pendingAdd} consumePendingAdd={consumePendingAdd} />
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
        onEditorClick={() => setEditorOpen(true)}
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

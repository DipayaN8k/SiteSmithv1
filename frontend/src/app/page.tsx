import { Hero } from "@/components/Hero";
import { ScratchServices } from "@/components/ScratchServices";
import { PreviewTeaser } from "@/components/PreviewTeaser";
import { Faq, FinalCta, Process, Work } from "@/components/Sections";

export default function Home() {
  return (
    <>
      <Hero />
      <ScratchServices />
      <PreviewTeaser />
      <Work />
      <Process />
      <Faq />
      <FinalCta />
    </>
  );
}

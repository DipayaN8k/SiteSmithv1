import { Hero } from "@/components/Hero";
import { ScratchServices } from "@/components/ScratchServices";
import { Stats } from "@/components/Stats";
import { Faq, FinalCta, Process, Work } from "@/components/Sections";

export default function Home() {
  return (
    <>
      <Hero />
      <ScratchServices />
      <Work />
      <Stats />
      <Process />
      <Faq />
      <FinalCta />
    </>
  );
}

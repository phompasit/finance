import { useEffect, useState } from "react";
import { Button } from "@chakra-ui/react";

export default function PWAInstallBanner() {
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!prompt) return null;

  return (
    <Button
      colorScheme="green"
      onClick={async () => {
        prompt.prompt();
        await prompt.userChoice;
        setPrompt(null);
      }}
    >
      ຕິດຕັ້ງແອັບ
    </Button>
  );
}

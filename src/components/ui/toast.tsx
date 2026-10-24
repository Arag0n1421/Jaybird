import { Toaster as Sonner, toast as sonnerToast } from "sonner";

/** Mount once in the root. */
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border !border-border !bg-jci-white !text-jci-black !font-sans",
          description: "!text-muted-foreground",
          success: "!border-jci-teal",
          error: "!border-destructive",
        },
      }}
    />
  );
}

/** Short, warm notifications. */
export const toast = {
  success: (msg: string, description?: string) => sonnerToast.success(msg, { description }),
  error: (msg: string, description?: string) => sonnerToast.error(msg, { description }),
  info: (msg: string, description?: string) => sonnerToast(msg, { description }),
};

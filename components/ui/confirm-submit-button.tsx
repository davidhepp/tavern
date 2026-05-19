"use client";

import { type ComponentProps, useRef } from "react";
import { useFormStatus } from "react-dom";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ConfirmSubmitButtonProps = Omit<
  ComponentProps<typeof Button>,
  "onClick" | "type"
> & {
  confirmTitle: string;
  confirmDescription?: string;
  confirmLabel?: string;
};

export function ConfirmSubmitButton({
  confirmTitle,
  confirmDescription,
  confirmLabel = "Confirm",
  disabled,
  children,
  formAction,
  formEncType,
  formMethod,
  formNoValidate,
  formTarget,
  name,
  value,
  ...props
}: ConfirmSubmitButtonProps) {
  const submitRef = useRef<HTMLButtonElement>(null);
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button {...props} type="button" disabled={disabled || pending}>
            {children}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            {confirmDescription ? (
              <AlertDialogDescription>
                {confirmDescription}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={props.variant === "destructive" ? "destructive" : "default"}
              onClick={() => {
                submitRef.current?.click();
              }}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <button
        ref={submitRef}
        type="submit"
        hidden
        formAction={formAction}
        formEncType={formEncType}
        formMethod={formMethod}
        formNoValidate={formNoValidate}
        formTarget={formTarget}
        name={name}
        value={value}
      />
    </>
  );
}

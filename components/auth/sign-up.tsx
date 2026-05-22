"use client";

import {
  authMutationKeys,
  parseAdditionalFieldValue,
} from "@better-auth-ui/core";
import {
  useAuth,
  useFetchOptions,
  useSignUpEmail,
} from "@better-auth-ui/react";
import { useIsMutating } from "@tanstack/react-query";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { type SyntheticEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { Label } from "../ui/label";
import { AdditionalField } from "./additional-field";
import { ProviderButtons, type SocialLayout } from "./provider-buttons";

export type SignUpProps = {
  className?: string;
  socialLayout?: SocialLayout;
  socialPosition?: "top" | "bottom";
};

/**
 * Renders a sign-up form with name, email, and password fields, optional social provider buttons, and submission handling.
 *
 * Submits credentials to the configured auth client and handles the response:
 * - If email verification is required, shows a notification and navigates to sign-in
 * - On success, refreshes the session and navigates to the configured redirect path
 * - On failure, displays error toasts
 * - Manages a pending state while the request is in-flight
 *
 * @param className - Additional CSS classes applied to the outer container
 * @param socialLayout - Social layout to apply to the component
 * @param socialPosition - Social position to apply to the component
 * @returns The sign-up form React element.
 */
export function SignUp({
  className,
  socialLayout,
  socialPosition = "bottom",
}: SignUpProps) {
  const {
    additionalFields,
    authClient,
    basePaths,
    emailAndPassword,
    localization,
    plugins,
    redirectTo,
    socialProviders,
    viewPaths,
    navigate,
    Link,
  } = useAuth();

  const { fetchOptions, resetFetchOptions } = useFetchOptions();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [invitationHelpOpen, setInvitationHelpOpen] = useState(false);

  const navigateToSignIn = () => {
    navigate({ to: `${basePaths.auth}/${viewPaths.auth.signIn}` });
  };

  const { mutate: signUpEmail, isPending: signUpEmailPending } = useSignUpEmail(
    authClient,
    {
      onError: (error) => {
        setPassword("");
        setConfirmPassword("");
        toast.error(error.error?.message || error.message);
        resetFetchOptions();
      },
      onSuccess: () => {
        if (emailAndPassword?.requireEmailVerification) {
          resetFetchOptions();
          setVerificationDialogOpen(true);
        } else {
          navigate({ to: redirectTo });
        }
      },
    },
  );

  const signInMutating = useIsMutating({
    mutationKey: authMutationKeys.signIn.all,
  });
  const signUpMutating = useIsMutating({
    mutationKey: authMutationKeys.signUp.all,
  });
  const isPending = signInMutating + signUpMutating > 0;

  const Captcha = plugins.find(
    (plugin) => plugin.captchaComponent,
  )?.captchaComponent;

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    invitationCode?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    // `emailAndPassword.name === false` hides the name field and submits "".
    const name = (formData.get("name") as string | null) ?? "";
    const email = formData.get("email") as string;
    const invitationCode = formData.get("invitationCode") as string;

    if (emailAndPassword?.confirmPassword && password !== confirmPassword) {
      toast.error(localization.auth.passwordsDoNotMatch);
      setPassword("");
      setConfirmPassword("");
      return;
    }

    const additionalFieldValues: Record<string, unknown> = {};

    for (const field of additionalFields ?? []) {
      if (!field.signUp || field.readOnly) continue;
      const value = parseAdditionalFieldValue(
        field,
        formData.get(field.name) as string | null,
      );

      if (field.validate) {
        try {
          await field.validate(value);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : String(error));
          return;
        }
      }

      if (value !== undefined) {
        additionalFieldValues[field.name] = value;
      }
    }

    const signUpPayload = {
      name,
      email,
      password,
      ...additionalFieldValues,
      invitationCode,
      fetchOptions,
    } as Parameters<typeof signUpEmail>[0] & { invitationCode: string };

    signUpEmail(signUpPayload);
  };

  const showSocialProviders = false;
  const showSeparator =
    emailAndPassword?.enabled &&
    showSocialProviders &&
    socialProviders &&
    socialProviders.length > 0;

  return (
    <>
      <Dialog
        open={verificationDialogOpen}
        onOpenChange={(open) => {
          setVerificationDialogOpen(open);

          if (!open) {
            navigateToSignIn();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MailCheck className="size-6" />
            </div>
            <DialogTitle>{localization.auth.verifyYourEmail}</DialogTitle>
            <DialogDescription>
              We sent a verification link to your email address. Open it to
              activate your Tavern account, then sign in.
            </DialogDescription>
          </DialogHeader>

          <Button className="w-full" onClick={navigateToSignIn}>
            Continue to sign in
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={invitationHelpOpen} onOpenChange={setInvitationHelpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Why do I need an invitation?</DialogTitle>
            <DialogDescription>
              Tavern is invite only. You need to be invited by an existing
              member before you can create an account.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <div className={cn("flex w-full max-w-sm flex-col gap-4", className)}>
        <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            {localization.auth.signUp}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-6">
            {socialPosition === "top" && (
              <>
                {showSocialProviders &&
                  socialProviders &&
                  socialProviders.length > 0 && (
                    <ProviderButtons socialLayout={socialLayout} />
                  )}

                {showSeparator && (
                  <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card text-xs flex items-center">
                    {localization.auth.or}
                  </FieldSeparator>
                )}
              </>
            )}

            {emailAndPassword?.enabled && (
              <form onSubmit={handleSubmit}>
                <FieldGroup>
                  {emailAndPassword.name !== false && (
                    <Field data-invalid={!!fieldErrors.name}>
                      <Label htmlFor="name">{localization.auth.name}</Label>

                      <Input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        placeholder={localization.auth.namePlaceholder}
                        required
                        disabled={isPending}
                        onChange={() => {
                          setFieldErrors((prev) => ({
                            ...prev,
                            name: undefined,
                          }));
                        }}
                        onInvalid={(e) => {
                          e.preventDefault();

                          setFieldErrors((prev) => ({
                            ...prev,
                            name: (e.target as HTMLInputElement)
                              .validationMessage,
                          }));
                        }}
                        aria-invalid={!!fieldErrors.name}
                      />

                      <FieldError>{fieldErrors.name}</FieldError>
                    </Field>
                  )}

                  <Field data-invalid={!!fieldErrors.email}>
                    <Label htmlFor="email">{localization.auth.email}</Label>

                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder={localization.auth.emailPlaceholder}
                      required
                      disabled={isPending}
                      onChange={() => {
                        setFieldErrors((prev) => ({
                          ...prev,
                          email: undefined,
                        }));
                      }}
                      onInvalid={(e) => {
                        e.preventDefault();

                        setFieldErrors((prev) => ({
                          ...prev,
                          email: (e.target as HTMLInputElement)
                            .validationMessage,
                        }));
                      }}
                      aria-invalid={!!fieldErrors.email}
                    />

                    <FieldError>{fieldErrors.email}</FieldError>
                  </Field>

                  <Field data-invalid={!!fieldErrors.invitationCode}>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="invitationCode">Invitation code</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-5 rounded-full text-xs text-muted-foreground"
                        aria-label="Explain invitation codes"
                        onClick={() => setInvitationHelpOpen(true)}
                      >
                        ?
                      </Button>
                    </div>

                    <Input
                      id="invitationCode"
                      name="invitationCode"
                      type="text"
                      autoComplete="one-time-code"
                      placeholder="Enter your invite code"
                      required
                      disabled={isPending}
                      onChange={() => {
                        setFieldErrors((prev) => ({
                          ...prev,
                          invitationCode: undefined,
                        }));
                      }}
                      onInvalid={(e) => {
                        e.preventDefault();

                        setFieldErrors((prev) => ({
                          ...prev,
                          invitationCode: (e.target as HTMLInputElement)
                            .validationMessage,
                        }));
                      }}
                      aria-invalid={!!fieldErrors.invitationCode}
                    />

                    <FieldError>{fieldErrors.invitationCode}</FieldError>
                  </Field>

                  {additionalFields?.map(
                    (field) =>
                      field.signUp === "above" && (
                        <AdditionalField
                          key={field.name}
                          name={field.name}
                          field={field}
                          isPending={isPending}
                        />
                      ),
                  )}

                  <Field data-invalid={!!fieldErrors.password}>
                    <Label htmlFor="password">
                      {localization.auth.password}
                    </Label>

                    <InputGroup>
                      <InputGroupInput
                        id="password"
                        name="password"
                        type={isPasswordVisible ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setFieldErrors((prev) => ({
                            ...prev,
                            password: undefined,
                          }));
                        }}
                        placeholder={localization.auth.passwordPlaceholder}
                        required
                        minLength={emailAndPassword?.minPasswordLength}
                        maxLength={emailAndPassword?.maxPasswordLength}
                        disabled={isPending}
                        onInvalid={(e) => {
                          e.preventDefault();

                          setFieldErrors((prev) => ({
                            ...prev,
                            password: (e.target as HTMLInputElement)
                              .validationMessage,
                          }));
                        }}
                        aria-invalid={!!fieldErrors.password}
                      />

                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          aria-label={
                            isPasswordVisible
                              ? localization.auth.hidePassword
                              : localization.auth.showPassword
                          }
                          title={
                            isPasswordVisible
                              ? localization.auth.hidePassword
                              : localization.auth.showPassword
                          }
                          onClick={() => {
                            setIsPasswordVisible(!isPasswordVisible);
                          }}
                        >
                          {isPasswordVisible ? <EyeOff /> : <Eye />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>

                    <FieldError>{fieldErrors.password}</FieldError>
                  </Field>

                  {emailAndPassword?.confirmPassword && (
                    <Field data-invalid={!!fieldErrors.confirmPassword}>
                      <Label htmlFor="confirmPassword">
                        {localization.auth.confirmPassword}
                      </Label>

                      <InputGroup>
                        <InputGroupInput
                          id="confirmPassword"
                          name="confirmPassword"
                          type={isConfirmPasswordVisible ? "text" : "password"}
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);

                            setFieldErrors((prev) => ({
                              ...prev,
                              confirmPassword: undefined,
                            }));
                          }}
                          placeholder={
                            localization.auth.confirmPasswordPlaceholder
                          }
                          required
                          minLength={emailAndPassword?.minPasswordLength}
                          maxLength={emailAndPassword?.maxPasswordLength}
                          disabled={isPending}
                          onInvalid={(e) => {
                            e.preventDefault();

                            setFieldErrors((prev) => ({
                              ...prev,
                              confirmPassword: (e.target as HTMLInputElement)
                                .validationMessage,
                            }));
                          }}
                          aria-invalid={!!fieldErrors.confirmPassword}
                        />

                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            aria-label={
                              isConfirmPasswordVisible
                                ? localization.auth.hidePassword
                                : localization.auth.showPassword
                            }
                            title={
                              isConfirmPasswordVisible
                                ? localization.auth.hidePassword
                                : localization.auth.showPassword
                            }
                            onClick={() =>
                              setIsConfirmPasswordVisible(
                                !isConfirmPasswordVisible,
                              )
                            }
                          >
                            {isConfirmPasswordVisible ? <EyeOff /> : <Eye />}
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>

                      <FieldError>{fieldErrors.confirmPassword}</FieldError>
                    </Field>
                  )}

                  {additionalFields?.map(
                    (field) =>
                      field.signUp &&
                      field.signUp !== "above" && (
                        <AdditionalField
                          key={field.name}
                          name={field.name}
                          field={field}
                          isPending={isPending}
                        />
                      ),
                  )}

                  {Captcha && (
                    <div className="flex justify-center">{Captcha}</div>
                  )}

                  <div className="flex flex-col gap-3">
                    <Button type="submit" disabled={isPending}>
                      {signUpEmailPending && <Spinner />}

                      {localization.auth.signUp}
                    </Button>

                    {plugins.flatMap((plugin) =>
                      (plugin.authButtons ?? []).map((AuthButton, index) => (
                        <AuthButton
                          key={`${plugin.id}-${index.toString()}`}
                          view="signUp"
                        />
                      )),
                    )}
                  </div>
                </FieldGroup>
              </form>
            )}

            {socialPosition === "bottom" && (
              <>
                {showSeparator && (
                  <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card text-xs flex items-center">
                    {localization.auth.or}
                  </FieldSeparator>
                )}

                {showSocialProviders &&
                  socialProviders &&
                  socialProviders.length > 0 && (
                    <ProviderButtons socialLayout={socialLayout} />
                  )}
              </>
            )}
          </div>

          {emailAndPassword?.enabled && (
            <div className="flex flex-col gap-3 items-center w-full mt-4">
              <FieldDescription className="text-center">
                {localization.auth.alreadyHaveAnAccount}{" "}
                <Link
                  href={`${basePaths.auth}/${viewPaths.auth.signIn}`}
                  className="underline underline-offset-4"
                >
                  {localization.auth.signIn}
                </Link>
              </FieldDescription>
            </div>
          )}
        </CardContent>
        </Card>
      </div>
    </>
  );
}

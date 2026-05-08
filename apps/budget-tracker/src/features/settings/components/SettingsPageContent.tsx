"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function SettingsPageContent() {
  const { data: session, update } = useSession();
  const user = session?.user;
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const { register: regProfile, handleSubmit: handleProfile } = useForm<ProfileForm>({
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      email: user?.email ?? "",
      bio: user?.bio ?? "",
    },
  });

  const { register: regPassword, handleSubmit: handlePassword, reset: resetPassword } = useForm<PasswordForm>();

  async function onProfileSubmit(values: ProfileForm) {
    setProfileLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error();
      await update();
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  }

  async function onPasswordSubmit(values: PasswordForm) {
    if (values.newPassword !== values.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error);
      toast.success("Password changed successfully");
      resetPassword();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-card rounded-xl border p-5 space-y-4">
        <h2 className="text-base font-semibold">Profile</h2>
        <form onSubmit={handleProfile(onProfileSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input {...regProfile("firstName")} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input {...regProfile("lastName")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" {...regProfile("email")} />
          </div>
          <div className="space-y-1.5">
            <Label>Bio</Label>
            <Textarea rows={2} placeholder="A bit about yourself…" {...regProfile("bio")} />
          </div>
          <Button type="submit" size="sm" disabled={profileLoading}>
            {profileLoading ? "Saving…" : "Save Profile"}
          </Button>
        </form>
      </div>

      <Separator />

      {/* Password */}
      <div className="bg-card rounded-xl border p-5 space-y-4">
        <h2 className="text-base font-semibold">Change Password</h2>
        <form onSubmit={handlePassword(onPasswordSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Current Password</Label>
            <Input type="password" {...regPassword("currentPassword", { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <Input type="password" {...regPassword("newPassword", { required: true, minLength: 8 })} />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm New Password</Label>
            <Input type="password" {...regPassword("confirmPassword", { required: true })} />
          </div>
          <Button type="submit" size="sm" disabled={passwordLoading} variant="outline">
            {passwordLoading ? "Changing…" : "Change Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}

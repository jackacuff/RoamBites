import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/Layout";
import { UtensilsCrossed, AlertCircle } from "lucide-react";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["customer", "vendor", "organizer"], { required_error: "Please select a role" }),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function Signup() {
  const { signup, isSigningUp } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: "customer" }
  });

  const onSubmit = async (data: SignupForm) => {
    try {
      setServerError(null);
      await signup({ data });
    } catch (err: any) {
      setServerError(err?.message || "Failed to create account. Email might be in use.");
    }
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-md w-full">
          <div className="bg-card rounded-3xl shadow-2xl shadow-primary/10 border border-border p-8 md:p-10">
            <div className="text-center mb-8">
              <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-display font-bold text-foreground">Create an account</h2>
              <p className="mt-2 text-muted-foreground">Join the OK Food Trucks community</p>
            </div>

            {serverError && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start text-destructive">
                <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                <input
                  {...register("name")}
                  type="text"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="John Doe"
                />
                {errors.name && <p className="mt-1.5 text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email address</label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="you@example.com"
                />
                {errors.email && <p className="mt-1.5 text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                <input
                  {...register("password")}
                  type="password"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="••••••••"
                />
                {errors.password && <p className="mt-1.5 text-sm text-destructive">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">I am a...</label>
                <select
                  {...register("role")}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                >
                  <option value="customer">Foodie (Customer)</option>
                  <option value="vendor">Food Truck Owner (Vendor)</option>
                  <option value="organizer">Event Organizer</option>
                </select>
                {errors.role && <p className="mt-1.5 text-sm text-destructive">{errors.role.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSigningUp}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
              >
                {isSigningUp ? "Creating account..." : "Sign up"}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

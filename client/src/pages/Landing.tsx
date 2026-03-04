import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Play, Sparkles, Mail, Lock, ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function Landing() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, register, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) setLocation("/discover");
  }, [isAuthenticated, setLocation]);

  const isLoading = login.isPending || register.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mutation = isLogin ? login : register;
    mutation.mutate(
      { email, password },
      {
        onSuccess: () => {
          toast({
            title: isLogin ? "Welcome back!" : "Account created successfully",
            description: "Redirecting to your queue...",
          });
        },
        onError: (error: Error) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/30">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -z-10 mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-blue-900/20 rounded-full blur-[150px] -z-10 mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <nav className="relative z-10 w-full px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center shadow-lg shadow-primary/20">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
          <span className="text-2xl font-black tracking-tight tracking-tighter">Throb<span style={{ color: '#ef4444' }}>.TV</span></span>
        </div>
        <div className="flex gap-4">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground hidden sm:flex">
            How it works
          </Button>
          <Button variant="ghost" onClick={() => setIsLogin(true)}>
            Log in
          </Button>
        </div>
      </nav>

      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center max-w-7xl mx-auto px-6 py-12 gap-16 lg:gap-24 w-full">
        <div className="flex-1 flex flex-col items-start text-left">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-primary-foreground/80 mb-6 backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span>The ultimate lean-back experience</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl lg:text-7xl font-black leading-[1.1] mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/60"
          >
            Curate your perfect <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">video queue.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg lg:text-xl text-muted-foreground mb-10 max-w-lg leading-relaxed"
          >
            Sync your phone to your screen. Browse, line up videos, and watch uninterrupted with hands-free auto-advance.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <Button size="lg" className="h-14 px-8 text-base font-semibold rounded-full bg-white text-black hover:bg-gray-200 transition-colors shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
              Explore Demo <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-base font-semibold rounded-full border-white/20 bg-white/5 backdrop-blur-md hover:bg-white/10">
              View Supported Sites
            </Button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="mt-16 flex items-center gap-8 text-sm text-muted-foreground border-t border-white/10 pt-8 w-full max-w-md"
          >
            <div>
              <div className="text-2xl font-bold text-white mb-1">10k+</div>
              <div>Active Users</div>
            </div>
            <div className="w-px h-10 bg-white/10"></div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">2M+</div>
              <div>Videos Queued</div>
            </div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
              
              <div className="flex gap-4 mb-8">
                <button 
                  onClick={() => setIsLogin(true)}
                  className={`text-lg font-semibold pb-2 transition-colors relative ${isLogin ? 'text-white' : 'text-muted-foreground hover:text-white/80'}`}
                  data-testid="tab-login"
                >
                  Log In
                  {isLogin && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button 
                  onClick={() => setIsLogin(false)}
                  className={`text-lg font-semibold pb-2 transition-colors relative ${!isLogin ? 'text-white' : 'text-muted-foreground hover:text-white/80'}`}
                  data-testid="tab-signup"
                >
                  Sign Up
                  {!isLogin && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/80 font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-black/50 border-white/10 focus-visible:ring-primary text-white placeholder:text-muted-foreground/50 rounded-xl"
                      data-testid="input-email"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-white/80 font-medium">Password</Label>
                    {isLogin && (
                      <a href="#" className="text-xs text-primary hover:text-primary/80 transition-colors">Forgot password?</a>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type="password" 
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-12 bg-black/50 border-white/10 focus-visible:ring-primary text-white placeholder:text-muted-foreground/50 rounded-xl"
                      data-testid="input-password"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-12 mt-4 text-base font-semibold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-[0_0_20px_-5px_rgba(147,51,234,0.5)] transition-all"
                  data-testid="button-submit"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {isLogin ? "Logging in..." : "Creating account..."}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full relative">
                      <span>{isLogin ? <>Continue to Throb<span style={{ color: '#ef4444' }}>.TV</span></> : "Create Account"}</span>
                      <ChevronRight className="w-5 h-5 absolute right-2" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="mt-8 text-center text-xs text-muted-foreground">
                By continuing, you agree to our <a href="#" className="text-white hover:underline">Terms of Service</a> and <a href="#" className="text-white hover:underline">Privacy Policy</a>.
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

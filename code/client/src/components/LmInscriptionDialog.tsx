import { useState } from "react";
import { Lock, FileCheck2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { depot } from "@/lib/lmCv";

/**
 * La popup qui déverrouille le rapport.
 *
 * Elle ne redemande jamais le CV : le fichier et sa version parsée sont déjà en
 * session depuis le dépôt. Créer le compte passe donc par `/api/auth/cv-register`,
 * qui rattache le document au profil dans la foulée — la personne arrive sur la
 * plateforme avec ses expériences déjà là, pas devant un formulaire vide.
 */
export default function LmInscriptionDialog({
  ouvert,
  onOpenChange,
  modeInitial = "inscription",
}: {
  ouvert: boolean;
  onOpenChange: (v: boolean) => void;
  modeInitial?: "inscription" | "connexion";
}) {
  const fichier = depot.fichier();
  const cvParse = depot.cvParse();

  const [mode, setMode] = useState<"inscription" | "connexion">(modeInitial);
  const [email, setEmail] = useState(() => depot.email() || cvParse?.email || "");
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const prenom = cvParse?.firstName || "";
  const emailValide = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const pret = emailValide && motDePasse.length >= 8 && !enCours;

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pret) return;
    setEnCours(true);
    setErreur(null);

    try {
      if (mode === "connexion") {
        await apiRequest("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), password: motDePasse }),
        });
      } else if (cvParse) {
        // Le chemin normal : le CV analysé devient le profil.
        await apiRequest("/api/auth/cv-register", {
          method: "POST",
          body: JSON.stringify({
            cvData: { ...cvParse, email: email.trim() },
            password: motDePasse,
            cvFile: fichier,
            isProfilePublic: true,
          }),
        });
      } else {
        // Secours : le parsing avait échoué, on crée quand même le compte.
        await apiRequest("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), password: motDePasse, firstName: prenom || "—", lastName: "" }),
        });
      }
      sessionStorage.setItem("newlyRegistered", "true");
      window.location.href = "/";
    } catch (e: any) {
      setErreur(e?.message || "La création du compte n'a pas abouti. Réessayez.");
      setEnCours(false);
    }
  };

  return (
    <Dialog open={ouvert} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="lm-cv-dialog-inscription">
        <DialogHeader>
          <DialogTitle className="text-xl text-balance">
            {mode === "inscription"
              ? prenom
                ? `${prenom}, votre rapport complet vous attend`
                : "Votre rapport complet vous attend"
              : "Content de vous revoir"}
          </DialogTitle>
          <DialogDescription>
            {mode === "inscription"
              ? "Tous les points relevés, le plan d'action entier, et les offres qui correspondent à votre profil."
              : "Connectez-vous pour retrouver votre rapport et votre espace."}
          </DialogDescription>
        </DialogHeader>

        {mode === "inscription" && fichier && (
          <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm leading-snug">
              <span className="font-semibold">{fichier.name}</span> est déjà rattaché.
              <span className="text-muted-foreground"> Rien à redéposer : vos expériences seront dans votre espace.</span>
            </p>
          </div>
        )}

        <form onSubmit={envoyer} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="lm-email">Votre e-mail</Label>
            <Input
              id="lm-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              data-testid="lm-cv-dialog-email"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lm-mdp">Mot de passe</Label>
            <Input
              id="lm-mdp"
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              autoComplete={mode === "inscription" ? "new-password" : "current-password"}
              data-testid="lm-cv-dialog-mdp"
            />
            {mode === "inscription" && (
              <p className="text-xs text-muted-foreground">Huit caractères au minimum.</p>
            )}
          </div>

          {erreur && <p className="text-sm text-destructive">{erreur}</p>}

          <Button type="submit" className="w-full" disabled={!pret} data-testid="lm-cv-dialog-valider">
            {enCours ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Un instant…
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                {mode === "inscription" ? "Débloquer mon rapport" : "Me connecter"}
              </>
            )}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "inscription" ? "connexion" : "inscription");
            setErreur(null);
          }}
          className="text-center text-sm text-muted-foreground hover:text-primary"
        >
          {mode === "inscription" ? "J'ai déjà un compte" : "Je n'ai pas encore de compte"}
        </button>
      </DialogContent>
    </Dialog>
  );
}

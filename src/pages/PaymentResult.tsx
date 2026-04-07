import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";

const PaymentResult = () => {
  const [params] = useSearchParams();
  const status = params.get("status");
  const orderId = params.get("order_id") || "";
  const isSuccess = status === "success";
  const isTopUp = orderId.startsWith("topup_");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center px-4 py-20">
        <div className="text-center space-y-6 max-w-md">
          {isSuccess ? (
            <>
              <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
              <h1 className="text-2xl font-bold text-foreground">
                {isTopUp ? "Balans artırıldı!" : "Ödəniş uğurlu!"}
              </h1>
              <p className="text-muted-foreground">
                {isTopUp
                  ? "Məbləğ balansınıza əlavə edildi."
                  : "Ödənişiniz qəbul edildi. Sifarişiniz təsdiqləndi."}
              </p>
            </>
          ) : (
            <>
              <XCircle className="h-20 w-20 text-destructive mx-auto" />
              <h1 className="text-2xl font-bold text-foreground">Ödəniş uğursuz oldu</h1>
              <p className="text-muted-foreground">
                Kart ödənişi zamanı xəta baş verdi. Yenidən cəhd edə bilərsiniz.
              </p>
            </>
          )}
          <div className="flex gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link to="/">Ana səhifə</Link>
            </Button>
            <Button asChild>
              <Link to="/orders">Sifarişlərim</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;

import { Navigate, Route, Routes } from "react-router-dom";
import StoreHome from "./pages/StoreHome";
import StoreProductPage from "./pages/StoreProductPage";
import StoreCart from "./pages/StoreCart";
import StoreCheckout from "./pages/StoreCheckout";
import StoreAccount from "./pages/StoreAccount";
import StoreSignIn from "./pages/StoreSignIn";
import StoreSignUp from "./pages/StoreSignUp";
import StoreAdmin from "./admin/StoreAdmin";
import StoreAdminLogin from "./admin/StoreAdminLogin";
import StoreCatalogGuard from "./StoreCatalogGuard";
import { StoreCustomerProvider } from "./StoreCustomerContext";
import { storeRootPath } from "./urls";

function StoreUnknownRedirect() {
  return <Navigate to={storeRootPath()} replace />;
}

/** Routes for store.usclt20.com (and /store on main site). */
export default function StoreApp() {
  const storeRoot = storeRootPath();

  return (
    <StoreCustomerProvider>
      <Routes>
        <Route path="admin/login" element={<StoreAdminLogin />} />
        <Route path="admin/*" element={<StoreAdmin />} />
        <Route path="home" element={<Navigate to={storeRoot} replace />} />
        <Route element={<StoreCatalogGuard />}>
          <Route path="signin" element={<StoreSignIn />} />
          <Route path="signup" element={<StoreSignUp />} />
          <Route path="product/:slug" element={<StoreProductPage />} />
          <Route path="cart" element={<StoreCart />} />
          <Route path="checkout" element={<StoreCheckout />} />
          <Route path="account" element={<StoreAccount />} />
          <Route index element={<StoreHome />} />
          <Route path="*" element={<StoreUnknownRedirect />} />
        </Route>
      </Routes>
    </StoreCustomerProvider>
  );
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { ShopProvider } from './context/ShopContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <ShopProvider>
        <CartProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </CartProvider>
      </ShopProvider>
    </AuthProvider>
  </React.StrictMode>
);

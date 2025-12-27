import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import { authService } from '../services/api';
import toast from 'react-hot-toast';

export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authService.forgotPassword(email);
      setSent(true);
      toast.success('Email de recuperação enviado!');
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao enviar email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-emerald-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-2xl mb-4">
              <MessageCircle className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">WhatsBenemax</h1>
            <p className="text-gray-600">Recuperar senha</p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="seu@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-emerald-500 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Email de recuperação enviado! Verifique sua caixa de entrada.
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/entrar"
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

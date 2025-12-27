import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Eye, EyeOff, Building2, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Cadastrar() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    nomeEmpresa: '',
    codigoAfiliado: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    const newErrors: Record<string, string> = {};

    if (formData.nome.length < 3) {
      newErrors.nome = 'Nome deve ter no mínimo 3 caracteres';
    }

    if (!formData.email.includes('@')) {
      newErrors.email = 'Email inválido';
    }

    if (formData.senha.length < 8) {
      newErrors.senha = 'Senha deve ter no mínimo 8 caracteres';
    }

    if (formData.senha !== formData.confirmarSenha) {
      newErrors.confirmarSenha = 'As senhas não coincidem';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await register({
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha,
        nomeEmpresa: formData.nomeEmpresa || undefined,
        codigoAfiliado: formData.codigoAfiliado || undefined,
      });

      navigate('/dashboard');
    } catch (error) {
      // Erro já tratado no context com toast
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    // Limpar erro do campo quando usuário digitar
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: '',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-emerald-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo e Título */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-2xl mb-4">
              <MessageCircle className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">WhatsBenemax</h1>
            <p className="text-gray-600">Crie sua conta gratuita</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nome */}
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Nome Completo</span>
                </div>
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.nome
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-200 focus:ring-purple-500'
                }`}
                placeholder="Seu nome completo"
              />
              {errors.nome && <p className="mt-1 text-sm text-red-600">{errors.nome}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-200 focus:ring-purple-500'
                }`}
                placeholder="seu@email.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Nome da Empresa (Opcional) */}
            <div>
              <label htmlFor="nomeEmpresa" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>Nome da Empresa</span>
                  <span className="text-xs text-gray-500">(Opcional)</span>
                </div>
              </label>
              <input
                type="text"
                id="nomeEmpresa"
                name="nomeEmpresa"
                value={formData.nomeEmpresa}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Nome da sua empresa"
              />
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="senha"
                  name="senha"
                  value={formData.senha}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 transition-all pr-12 ${
                    errors.senha
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-200 focus:ring-purple-500'
                  }`}
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.senha && <p className="mt-1 text-sm text-red-600">{errors.senha}</p>}
            </div>

            {/* Confirmar Senha */}
            <div>
              <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Senha
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmarSenha"
                  name="confirmarSenha"
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 transition-all pr-12 ${
                    errors.confirmarSenha
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-200 focus:ring-purple-500'
                  }`}
                  placeholder="Digite a senha novamente"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmarSenha && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmarSenha}</p>
              )}
            </div>

            {/* Código Afiliado (Opcional) */}
            <div>
              <label htmlFor="codigoAfiliado" className="block text-sm font-medium text-gray-700 mb-2">
                Código de Afiliado <span className="text-xs text-gray-500">(Opcional)</span>
              </label>
              <input
                type="text"
                id="codigoAfiliado"
                name="codigoAfiliado"
                value={formData.codigoAfiliado}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Código do afiliado"
              />
            </div>

            {/* Botão Cadastrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-emerald-500 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Cadastrando...' : 'Criar Conta'}
            </button>
          </form>

          {/* Link Login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Link
                to="/entrar"
                className="text-purple-600 hover:text-purple-700 font-semibold transition-colors"
              >
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

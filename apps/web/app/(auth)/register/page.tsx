'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  organizationName: z.string().min(2, 'Nome da empresa obrigatório'),
});

type FormData = z.infer<typeof schema>;

const inputClass = "w-full bg-[#0d1117] border border-[#30363d] text-gray-100 placeholder:text-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', data);
      setAuth(res.data.data);
      toast.success('Conta criada com sucesso!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-8">
      <h2 className="text-2xl font-semibold text-white mb-6">Criar conta gratuita</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Seu nome</label>
          <input {...register('name')} placeholder="João Silva" className={inputClass} />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
          <input {...register('email')} type="email" placeholder="joao@empresa.com" className={inputClass} />
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Senha</label>
          <input {...register('password')} type="password" placeholder="Mínimo 8 caracteres" className={inputClass} />
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Nome da empresa / agência</label>
          <input {...register('organizationName')} placeholder="Minha Agência" className={inputClass} />
          {errors.organizationName && <p className="text-red-400 text-xs mt-1">{errors.organizationName.message}</p>}
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition">
          {loading ? 'Criando conta...' : 'Criar conta grátis'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-4">
        Já tem conta?{' '}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300">Entrar</Link>
      </p>
    </div>
  );
}

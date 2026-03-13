import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PoliticaDePrivacidade() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link to={createPageUrl('Inicio')}>
            <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-blue-600">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o Início
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-gray-900">Política de Privacidade</h1>
          
          <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
            <p>
              A sua privacidade é importante para nós. É política do TransferOnline respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site TransferOnline, e outros sites que possuímos e operamos.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6">1. Informações que coletamos</h3>
            <p>
              Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.
            </p>
            <p>
              Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis ​​para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6">2. Compartilhamento de dados</h3>
            <p>
              Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6">3. Cookies</h3>
            <p>
              O nosso site usa cookies para melhorar a experiência do usuário. Ao utilizar nosso site, você concorda com o uso de cookies de acordo com nossa política.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6">4. Compromisso do Usuário</h3>
            <p>
              O usuário se compromete a fazer uso adequado dos conteúdos e da informação que o TransferOnline oferece no site e com caráter enunciativo, mas não limitativo:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Não se envolver em atividades que sejam ilegais ou contrárias à boa fé a à ordem pública;</li>
              <li>Não difundir propaganda ou conteúdo de natureza racista, xenofóbica, ou azar, qualquer tipo de pornografia ilegal, de apologia ao terrorismo ou contra os direitos humanos;</li>
              <li>Não causar danos aos sistemas físicos (hardwares) e lógicos (softwares) do TransferOnline, de seus fornecedores ou terceiros.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6">5. Mais informações</h3>
            <p>
              Esperemos que esteja esclarecido e, como mencionado anteriormente, se houver algo que você não tem certeza se precisa ou não, geralmente é mais seguro deixar os cookies ativados, caso interaja com um dos recursos que você usa em nosso site.
            </p>
            
            <p className="pt-6 text-sm text-gray-500">
              Esta política é efetiva a partir de {new Date().getFullYear()}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
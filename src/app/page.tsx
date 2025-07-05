import { SearchForm } from '@/components/SearchForm'
import { Header } from '@/components/Header'

export default function Home() {
  return (
    <main className="container mx-auto">
      <Header />
      
      <div className="text-center py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Encuentra Proveedores Confiables con IA
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Busca en AliExpress, SHEIN, Temu y más plataformas. 
          Nuestro Trust Score con IA te ayuda a elegir vendedores seguros.
        </p>
        
        <SearchForm />
      </div>
      
      <div className="py-16">
        <h2 className="text-2xl font-semibold text-center mb-12">
          ¿Por qué elegir Lukia?
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Trust Score con IA</h3>
            <p className="text-gray-600">
              Nuestro algoritmo analiza vendedores y detecta señales de confianza para que compres seguro.
            </p>
          </div>
          
          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Búsqueda Multi-plataforma</h3>
            <p className="text-gray-600">
              Busca en AliExpress, SHEIN, Temu y más plataformas desde un solo lugar.
            </p>
          </div>
          
          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Análisis de Reviews</h3>
            <p className="text-gray-600">
              IA que analiza reviews reales, detecta falsas y te da un resumen claro de cada producto.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
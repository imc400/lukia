export function Header() {
  return (
    <header className="py-6 border-b border-gray-200">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">L</span>
          </div>
          <span className="text-xl font-bold text-gray-900">Lukia</span>
        </div>
        
        <nav className="hidden md:flex space-x-6">
          <a href="#" className="text-gray-600 hover:text-primary-600 transition-colors">
            Inicio
          </a>
          <a href="#" className="text-gray-600 hover:text-primary-600 transition-colors">
            Cómo funciona
          </a>
          <a href="#" className="text-gray-600 hover:text-primary-600 transition-colors">
            Soporte
          </a>
        </nav>
      </div>
    </header>
  )
}
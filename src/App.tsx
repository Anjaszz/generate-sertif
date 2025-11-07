import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import './App.css'

interface NameEntry {
  name: string
  id: string
}

function App() {
  const [templateImage, setTemplateImage] = useState<string | null>(null)
  const [names, setNames] = useState<NameEntry[]>([])
  const [manualName, setManualName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 })
  const [fontSize, setFontSize] = useState(48)
  const [fontColor, setFontColor] = useState('#000000')
  const [fontFamily, setFontFamily] = useState('Poppins')
  const [fontWeight, setFontWeight] = useState('bold')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  // Available fonts
  const availableFonts = [
    'Poppins',
    'Arial',
    'Times New Roman',
    'Georgia',
    'Courier New',
    'Verdana',
    'Helvetica',
    'Comic Sans MS',
    'Impact',
    'Trebuchet MS',
    'Palatino',
    'Garamond',
    'Bookman',
    'Tahoma',
    'Century Gothic'
  ]

  const fontWeights = [
    { value: 'normal', label: 'Normal' },
    { value: 'bold', label: 'Bold' },
    { value: '100', label: 'Thin' },
    { value: '300', label: 'Light' },
    { value: '500', label: 'Medium' },
    { value: '600', label: 'Semi Bold' },
    { value: '700', label: 'Bold' },
    { value: '800', label: 'Extra Bold' },
    { value: '900', label: 'Black' }
  ]

  // Handle template image upload
  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setTemplateImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle Excel file upload
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

        // Assume first column contains names
        const namesList: NameEntry[] = jsonData
          .slice(1) // Skip header row
          .filter((row) => row[0]) // Filter empty rows
          .map((row, index) => ({
            name: row[0].toString(),
            id: `${Date.now()}-${index}`
          }))

        setNames(prev => [...prev, ...namesList])
      }
      reader.readAsBinaryString(file)
    }
  }

  // Add manual name
  const handleAddManualName = () => {
    if (manualName.trim()) {
      setNames(prev => [...prev, { name: manualName.trim(), id: `${Date.now()}` }])
      setManualName('')
    }
  }

  // Remove name from list
  const handleRemoveName = (id: string) => {
    setNames(prev => prev.filter(entry => entry.id !== id))
  }

  // Update preview when settings change
  useEffect(() => {
    if (!templateImage || !previewCanvasRef.current) return

    const canvas = previewCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      // Set canvas size to match image (scaled down for preview)
      const maxWidth = 600
      const scale = Math.min(1, maxWidth / img.width)
      canvas.width = img.width * scale
      canvas.height = img.height * scale

      // Draw template
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Draw preview text
      ctx.font = `${fontWeight} ${fontSize * scale}px ${fontFamily}`
      ctx.fillStyle = fontColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Calculate position as percentage of image dimensions
      const x = (textPosition.x / 100) * canvas.width
      const y = (textPosition.y / 100) * canvas.height

      // Draw sample text
      const sampleName = names.length > 0 ? names[0].name : 'Contoh Nama'
      ctx.fillText(sampleName, x, y)
    }
    img.src = templateImage
  }, [templateImage, textPosition, fontSize, fontColor, fontFamily, fontWeight, names])

  // Generate single certificate
  const generateCertificate = (name: string): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current
      if (!canvas || !templateImage) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const img = new Image()
      img.onload = () => {
        // Set canvas size to match image
        canvas.width = img.width
        canvas.height = img.height

        // Draw template
        ctx.drawImage(img, 0, 0)

        // Draw name
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
        ctx.fillStyle = fontColor
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Calculate position as percentage of image dimensions
        const x = (textPosition.x / 100) * img.width
        const y = (textPosition.y / 100) * img.height

        ctx.fillText(name, x, y)

        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
        }, 'image/png')
      }
      img.src = templateImage
    })
  }

  // Generate all certificates and download as ZIP
  const handleGenerateAll = async () => {
    if (!templateImage || names.length === 0) {
      alert('Silakan upload template dan tambahkan minimal 1 nama')
      return
    }

    setIsGenerating(true)

    try {
      const zip = new JSZip()

      for (const entry of names) {
        const blob = await generateCertificate(entry.name)
        const sanitizedName = entry.name.replace(/[^a-z0-9]/gi, '_')
        zip.file(`sertifikat_${sanitizedName}.png`, blob)
      }

      // Generate ZIP file
      const content = await zip.generateAsync({ type: 'blob' })

      // Download ZIP
      const url = URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = `sertifikat_bulk_${Date.now()}.zip`
      link.click()
      URL.revokeObjectURL(url)

      alert(`Berhasil generate ${names.length} sertifikat!`)
    } catch (error) {
      console.error('Error generating certificates:', error)
      alert('Terjadi error saat generate sertifikat')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white text-blue-600 rounded-lg p-2 sm:p-3">
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Generator Sertifikat</h1>
                <p className="text-xs sm:text-sm text-blue-100">Buat sertifikat dalam hitungan detik</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-4 sm:py-8 px-4 sm:px-8">
        <div className="w-full max-w-full bg-white p-4 sm:p-6 rounded-lg shadow-lg">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-[1800px] mx-auto">
          {/* Left Panel - Upload & Input */}
          <div className="space-y-4 sm:space-y-6">
            {/* Template Upload */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-700">1. Upload Template Sertifikat</h2>
              <input
                type="file"
                accept="image/*"
                onChange={handleTemplateUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {templateImage && (
                <img src={templateImage} alt="Template" className="mt-4 w-full rounded border" />
              )}
            </div>

            {/* Text Customization with Preview */}
            {templateImage && (
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-700">2. Atur Posisi & Style Teks</h2>

                {/* Live Preview */}
                <div className="mb-4 sm:mb-6 bg-gray-100 p-3 sm:p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Preview Live:</h3>
                  <div className="flex justify-center">
                    <canvas
                      ref={previewCanvasRef}
                      className="max-w-full border-2 border-gray-300 rounded shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Posisi Horizontal: {textPosition.x}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={textPosition.x}
                      onChange={(e) => setTextPosition(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Posisi Vertical: {textPosition.y}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={textPosition.y}
                      onChange={(e) => setTextPosition(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ukuran Font: {fontSize}px
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="400"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jenis Font
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {availableFonts.map((font) => (
                        <option key={font} value={font} style={{ fontFamily: font }}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ketebalan Font
                    </label>
                    <select
                      value={fontWeight}
                      onChange={(e) => setFontWeight(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {fontWeights.map((weight) => (
                        <option key={weight.value} value={weight.value}>
                          {weight.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Warna Font
                    </label>
                    <input
                      type="color"
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      className="w-20 h-10 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Names Input */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-700">3. Tambah Nama</h2>

              {/* Excel Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Excel (Kolom pertama = Nama)
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="block w-full text-sm text-gray-500 file:mr-2 sm:file:mr-4 file:py-2 file:px-3 sm:file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
              </div>

              {/* Manual Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Atau Tambah Manual
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddManualName()}
                    placeholder="Masukkan nama..."
                    className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                  <button
                    onClick={handleAddManualName}
                    className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm sm:text-base whitespace-nowrap"
                  >
                    Tambah
                  </button>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateAll}
              disabled={isGenerating || !templateImage || names.length === 0}
              className="w-full py-3 sm:py-4 bg-green-600 text-white rounded-lg font-bold text-base sm:text-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? 'Generating...' : `Generate & Download (${names.length} Sertifikat)`}
            </button>
          </div>

          {/* Right Panel - Names List */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-700">
              Daftar Nama ({names.length})
            </h2>
            {names.length === 0 ? (
              <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">Belum ada nama ditambahkan</p>
            ) : (
              <div className="space-y-2 max-h-[400px] sm:max-h-[600px] overflow-y-auto">
                {names.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-md hover:bg-gray-100"
                  >
                    <span className="font-medium text-gray-800 text-sm sm:text-base truncate mr-2">{entry.name}</span>
                    <button
                      onClick={() => handleRemoveName(entry.id)}
                      className="px-2 sm:px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* About Section */}
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generator Sertifikat
              </h3>
              <p className="text-gray-400 text-sm">
                Aplikasi web untuk membuat sertifikat secara bulk dengan mudah dan cepat. Upload template, tambahkan nama, dan download hasilnya dalam format ZIP.
              </p>
            </div>

            {/* Features Section */}
            <div>
              <h3 className="text-lg font-bold mb-3">Fitur Utama</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Upload template sertifikat
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Import nama dari Excel
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Kustomisasi font dan posisi
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Bulk generation & download ZIP
                </li>
              </ul>
            </div>

            {/* Creator Section */}
            <div>
              <h3 className="text-lg font-bold mb-3">Developer</h3>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="bg-blue-600 rounded-full p-3">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                  </div>
                  <div>
                    <a href="https://anjasrani.my.id"><p className="font-bold text-lg text-start">Anjaszzz</p></a>
                    <p className="text-xs text-gray-400">Frontend Developer</p>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Passionate about creating useful web applications
                </p>
                <div className="flex space-x-2">
                  <a href="https://github.com/Anjaszz" className="bg-gray-600 hover:bg-gray-500 p-2 rounded transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </a>
                  <a href="https://www.linkedin.com/in/anjas-rani-562396212" className="bg-gray-600 hover:bg-gray-500 p-2 rounded transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                  </a>
                  <a href="https://www.instagram.com/anjaszz_/" className="bg-gray-600 hover:bg-gray-500 p-2 rounded transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-700 mt-6 sm:mt-8 pt-6 sm:pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
              <p className="text-sm text-gray-400 text-center sm:text-left">
                &copy; {new Date().getFullYear()} Generator Sertifikat. All rights reserved.
              </p>
              <p className="text-sm font-semibold text-blue-400 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
               <a href="https://anjasrani.my.id"> Created by Anjaszzz</a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App

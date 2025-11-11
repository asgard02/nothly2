declare module 'pdf-parse' {
  interface PDFInfo {
    numpages: number
    numrender: number
    info: Record<string, any>
    metadata: any
    text: string
    version: string
  }

  interface PDFParseOptions {
    pagerender?: (pageData: any) => string | Promise<string>
    max?: number
  }

  function pdfParse(dataBuffer: Buffer | Uint8Array | ArrayBuffer, options?: PDFParseOptions): Promise<PDFInfo>

  export = pdfParse
}

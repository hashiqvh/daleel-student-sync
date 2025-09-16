import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const { data, filename } = await request.json();

    if (!data || !filename) {
      return NextResponse.json({ error: 'Data and filename are required' }, { status: 400 });
    }

    // Ensure the report directory exists
    const reportDir = path.join(process.cwd(), 'public', 'report');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const filePath = path.join(reportDir, filename);

    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();
    
    // Main data sheet
    const mainWs = XLSX.utils.json_to_sheet(data.allStudents);
    XLSX.utils.book_append_sheet(wb, mainWs, 'All Students');
    
    // Summary sheet
    const summaryWs = XLSX.utils.json_to_sheet(data.summary);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
    
    // Failed students sheet (if any)
    if (data.failedStudents && data.failedStudents.length > 0) {
      const failedWs = XLSX.utils.json_to_sheet(data.failedStudents);
      XLSX.utils.book_append_sheet(wb, failedWs, 'Failed Students');
    }

    // Write the file
    XLSX.writeFile(wb, filePath);

    return NextResponse.json({ 
      success: true, 
      message: 'Report updated successfully',
      filePath: `/report/${filename}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Report update error:', error);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', 'report', filename);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stats = fs.statSync(filePath);
    
    return NextResponse.json({
      exists: true,
      filename,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      url: `/report/${filename}`
    });
  } catch (error) {
    console.error('Report check error:', error);
    return NextResponse.json({ error: 'Failed to check report' }, { status: 500 });
  }
}

'use client';

import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
/* eslint-disable @typescript-eslint/no-explicit-any */

interface ExcelRow {
  'Min. No.': string | number;
  'Total Fee': string | number;
  'Collected': string | number;
  'Balance': string | number;
  'Admn No.': string | number;
  'StudentGuid'?: string;
  'APIStatus'?: 'pending' | 'success' | 'not_found' | 'error';
  'StudentDetails'?: any;
  'UpdateStatus'?: 'pending' | 'success' | 'error';
  'UpdateMessage'?: string;
}

interface StudentAPIResponse {
  result: {
    totalAllData: number;
    total: number;
    data: Array<{
      id: number;
      studentGuid: string;
    }>;
  };
  statusCode: string;
  error: string | null;
  errorLocalized: string | null;
}

export default function ExcelUploadPage() {
  const { user, logout, getTimeUntilExpiry, isTokenExpired } = useAuth();
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingAPI, setIsProcessingAPI] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiProgress, setApiProgress] = useState({ current: 0, total: 0 });
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 });
  const [showDetails, setShowDetails] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [reportFilename, setReportFilename] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  const fetchStudentDetails = async (studentGuid: string, totalFee: number, collected: number, balance: number, studentNumber: number): Promise<any> => {
    try {
      const params = new URLSearchParams({
        studentGuid: studentGuid,
        totalFee: totalFee.toString(),
        collected: collected.toString(),
        balance: balance.toString(),
        studentNumber: studentNumber.toString()
      });
      
      const response = await fetch(`/api/student/details?${params}`);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Student Details API Error:', error);
      return null;
    }
  };

  const updateStudentData = async (studentGuid: string, studentData: any): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/student/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentGuid: studentGuid,
          studentData: studentData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.error || 'Update failed' };
      }

      const data = await response.json();
      return { success: true, message: data.message || 'Student updated successfully' };
    } catch (error) {
      console.error('Student Update API Error:', error);
      return { success: false, message: 'Update failed due to network error' };
    }
  };

  const fetchStudentData = async (ministryNumber: string): Promise<{ studentGuid?: string; status: 'success' | 'not_found' | 'error' }> => {
    try {
      const response = await fetch('/api/student/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ministryNumber })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          setError('Authentication failed: JWT token may be expired. Please contact support to refresh the API token.');
        }
        return { status: 'error' };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Error:', error);
      return { status: 'error' };
    }
  };

  const processStudentData = async (data: ExcelRow[]) => {
    setIsProcessingAPI(true);
    setApiProgress({ current: 0, total: data.length });
    
    const updatedData = [...data];
    
    for (let i = 0; i < data.length; i++) {
      const ministryNumber = String(data[i]['Min. No.']).trim();
      
      // Update progress
      setApiProgress({ current: i + 1, total: data.length });
      
      // Update the row with pending status
      updatedData[i] = { ...updatedData[i], APIStatus: 'pending' };
      setExcelData([...updatedData]);
      
      // Make API call
      const result = await fetchStudentData(ministryNumber);
      
      let studentDetails = null;
      if (result.status === 'success' && result.studentGuid) {
        // Fetch detailed student information with payment data from Excel
        studentDetails = await fetchStudentDetails(
          result.studentGuid,
          Number(data[i]['Total Fee']) || 0,
          Number(data[i]['Collected']) || 0,
          Number(data[i]['Balance']) || 0,
          Number(data[i]['Admn No.']) || 0
        );
      }
      
      // Update the row with result
      updatedData[i] = { 
        ...updatedData[i], 
        StudentGuid: result.studentGuid,
        APIStatus: result.status,
        StudentDetails: studentDetails
      };
      setExcelData([...updatedData]);
      setLastUpdated(new Date());
      await updateReportFile();
      
      // 2 second delay to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsProcessingAPI(false);
  };

  const downloadFailedStudents = () => {
    const failedStudents = excelData.filter(row => 
      row.APIStatus === 'error' || row.UpdateStatus === 'error'
    );

    if (failedStudents.length === 0) {
      setError('No failed students to download.');
      return;
    }

    // Prepare data for export
    const exportData = failedStudents.map(row => ({
      'Min. No.': row['Min. No.'],
      'Admn No.': row['Admn No.'] || '',
      'Total Fee': row['Total Fee'],
      'Collected': row['Collected'],
      'Balance': row['Balance'],
      'API Status': row.APIStatus || '',
      'Update Status': row.UpdateStatus || '',
      'Error Message': row.UpdateMessage || '',
      'Student GUID': row.StudentGuid || ''
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Failed Students');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `failed_students_${timestamp}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, filename);
  };

  const refreshData = () => {
    setLastUpdated(new Date());
  };

  const createReportFile = async () => {
    if (excelData.length === 0) return;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `students_report_${timestamp}.xlsx`;
    
    setReportFilename(filename);
    setReportUrl(`/report/${filename}`);
    
    await updateReportFile();
  };

  const updateReportFile = async () => {
    if (!reportFilename || excelData.length === 0) return;

    try {
      // Prepare comprehensive data for export
      const allStudentsData = excelData.map(row => ({
        'Min. No.': row['Min. No.'],
        'Admn No.': row['Admn No.'] || '',
        'Total Fee': row['Total Fee'],
        'Collected': row['Collected'],
        'Balance': row['Balance'],
        'API Status': row.APIStatus || 'Not Processed',
        'Update Status': row.UpdateStatus || 'Not Updated',
        'Error Message': row.UpdateMessage || '',
        'Student GUID': row.StudentGuid || '',
        'Last Updated': lastUpdated.toISOString()
      }));

      // Summary data
      const summaryData = [
        { 'Metric': 'Total Records', 'Count': excelData.length },
        { 'Metric': 'API Success', 'Count': excelData.filter(row => row.APIStatus === 'success').length },
        { 'Metric': 'API Not Found', 'Count': excelData.filter(row => row.APIStatus === 'not_found').length },
        { 'Metric': 'API Errors', 'Count': excelData.filter(row => row.APIStatus === 'error').length },
        { 'Metric': 'Update Success', 'Count': excelData.filter(row => row.UpdateStatus === 'success').length },
        { 'Metric': 'Update Failed', 'Count': excelData.filter(row => row.UpdateStatus === 'error').length },
        { 'Metric': 'Total Fee', 'Amount': totals.totalFee },
        { 'Metric': 'Total Collected', 'Amount': totals.collected },
        { 'Metric': 'Total Balance', 'Amount': totals.balance },
        { 'Metric': 'Last Updated', 'Count': lastUpdated.toISOString() }
      ];

      // Failed students data
      const failedStudents = excelData.filter(row => 
        row.APIStatus === 'error' || row.UpdateStatus === 'error'
      );
      const failedStudentsData = failedStudents.map(row => ({
        'Min. No.': row['Min. No.'],
        'Admn No.': row['Admn No.'] || '',
        'Total Fee': row['Total Fee'],
        'Collected': row['Collected'],
        'Balance': row['Balance'],
        'API Status': row.APIStatus || '',
        'Update Status': row.UpdateStatus || '',
        'Error Message': row.UpdateMessage || '',
        'Student GUID': row.StudentGuid || ''
      }));

      const response = await fetch('/api/report/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename: reportFilename,
          data: {
            allStudents: allStudentsData,
            summary: summaryData,
            failedStudents: failedStudentsData
          }
        })
      });

      if (!response.ok) {
        console.error('Failed to update report file');
      }
    } catch (error) {
      console.error('Error updating report file:', error);
    }
  };

  const downloadAllStudentsWithStatus = () => {
    if (excelData.length === 0) {
      setError('No data to download.');
      return;
    }

    // Prepare comprehensive data for export
    const exportData = excelData.map(row => ({
      'Min. No.': row['Min. No.'],
      'Admn No.': row['Admn No.'] || '',
      'Total Fee': row['Total Fee'],
      'Collected': row['Collected'],
      'Balance': row['Balance'],
      'API Status': row.APIStatus || 'Not Processed',
      'Update Status': row.UpdateStatus || 'Not Updated',
      'Error Message': row.UpdateMessage || '',
      'Student GUID': row.StudentGuid || '',
      'Last Updated': new Date().toISOString()
    }));

    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();
    
    // Main data sheet
    const mainWs = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, mainWs, 'All Students');
    
    // Summary sheet
    const summaryData = [
      { 'Metric': 'Total Records', 'Count': excelData.length },
      { 'Metric': 'API Success', 'Count': excelData.filter(row => row.APIStatus === 'success').length },
      { 'Metric': 'API Not Found', 'Count': excelData.filter(row => row.APIStatus === 'not_found').length },
      { 'Metric': 'API Errors', 'Count': excelData.filter(row => row.APIStatus === 'error').length },
      { 'Metric': 'Update Success', 'Count': excelData.filter(row => row.UpdateStatus === 'success').length },
      { 'Metric': 'Update Failed', 'Count': excelData.filter(row => row.UpdateStatus === 'error').length },
      { 'Metric': 'Total Fee', 'Amount': totals.totalFee },
      { 'Metric': 'Total Collected', 'Amount': totals.collected },
      { 'Metric': 'Total Balance', 'Amount': totals.balance }
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
    
    // Failed students sheet
    const failedStudents = excelData.filter(row => 
      row.APIStatus === 'error' || row.UpdateStatus === 'error'
    );
    if (failedStudents.length > 0) {
      const failedData = failedStudents.map(row => ({
        'Min. No.': row['Min. No.'],
        'Admn No.': row['Admn No.'] || '',
        'Total Fee': row['Total Fee'],
        'Collected': row['Collected'],
        'Balance': row['Balance'],
        'API Status': row.APIStatus || '',
        'Update Status': row.UpdateStatus || '',
        'Error Message': row.UpdateMessage || '',
        'Student GUID': row.StudentGuid || ''
      }));
      const failedWs = XLSX.utils.json_to_sheet(failedData);
      XLSX.utils.book_append_sheet(wb, failedWs, 'Failed Students');
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `students_status_report_${timestamp}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, filename);
  };

  const updateAllStudents = async () => {
    const studentsToUpdate = excelData.filter(row => 
      row.APIStatus === 'success' && row.StudentGuid && row.StudentDetails
    );

    if (studentsToUpdate.length === 0) {
      setError('No students available for update. Please process the Excel file first.');
      return;
    }

    setIsUpdating(true);
    setUpdateProgress({ current: 0, total: studentsToUpdate.length });
    
    const updatedData = [...excelData];
    
    for (let i = 0; i < studentsToUpdate.length; i++) {
      const row = studentsToUpdate[i];
      
      // Update progress
      setUpdateProgress({ current: i + 1, total: studentsToUpdate.length });
      
      // Find the row in the main data array
      const rowIndex = updatedData.findIndex(r => r['Min. No.'] === row['Min. No.']);
      
      // Update the row with pending status
      updatedData[rowIndex] = { ...updatedData[rowIndex], UpdateStatus: 'pending' };
      setExcelData([...updatedData]);
      
      // Make update API call
      const updateResult = await updateStudentData(row.StudentGuid!, row.StudentDetails);
      
      // Update the row with result
      updatedData[rowIndex] = { 
        ...updatedData[rowIndex], 
        UpdateStatus: updateResult.success ? 'success' : 'error',
        UpdateMessage: updateResult.message
      };
      setExcelData([...updatedData]);
      setLastUpdated(new Date());
      await updateReportFile();
      
      // 2 second delay to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsUpdating(false);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          throw new Error('Excel file must have at least a header row and one data row');
        }

        // Get headers and find the required columns
        const headers = jsonData[0] as string[];
        const minNoIndex = headers.findIndex(h => 
          h.toLowerCase().includes('min') && h.toLowerCase().includes('no')
        );
        const totalFeeIndex = headers.findIndex(h => 
          h.toLowerCase().includes('total') && h.toLowerCase().includes('fee')
        );
        const collectedIndex = headers.findIndex(h => 
          h.toLowerCase().includes('collected')
        );
        const balanceIndex = headers.findIndex(h => 
          h.toLowerCase().includes('balance')
        );
        const admnNoIndex = headers.findIndex(h => 
          h.toLowerCase().includes('admn') && h.toLowerCase().includes('no')
        );

        // Check if all required columns are found
        if (minNoIndex === -1 || totalFeeIndex === -1 || collectedIndex === -1 || balanceIndex === -1 || admnNoIndex === -1) {
          throw new Error('Excel file must contain columns: Min. No., Total Fee, Collected, and Balance');
        }

        // Process data rows - only include rows with valid Ministry No.
        const processedData: ExcelRow[] = jsonData.slice(1).map((row: unknown) => {
          const rowArray = row as any[];
          return {
            'Min. No.': rowArray[minNoIndex] || '',
            'Total Fee': rowArray[totalFeeIndex] || '',
            'Collected': rowArray[collectedIndex] || '',
            'Balance': rowArray[balanceIndex] || '',
            'Admn No.': rowArray[admnNoIndex] || '',
          };
        }).filter(row => {
          // Only include rows where Min. No. is not empty and not just whitespace
          const minNo = String(row['Min. No.']).trim();
          return minNo !== '' && minNo !== 'null' && minNo !== 'undefined';
        });

        setExcelData(processedData);
        
        // Create report file
        if (processedData.length > 0) {
          await createReportFile();
        }
        
        // Process student data with API calls
        if (processedData.length > 0) {
          await processStudentData(processedData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error parsing Excel file');
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading file');
      setIsLoading(false);
    };

    reader.readAsBinaryString(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const calculateTotals = () => {
    const totals = excelData.reduce((acc, row) => {
      const totalFee = parseFloat(String(row['Total Fee']).replace(/[^0-9.-]/g, '')) || 0;
      const collected = parseFloat(String(row['Collected']).replace(/[^0-9.-]/g, '')) || 0;
      const balance = parseFloat(String(row['Balance']).replace(/[^0-9.-]/g, '')) || 0;
      
      return {
        totalFee: acc.totalFee + totalFee,
        collected: acc.collected + collected,
        balance: acc.balance + balance
      };
    }, { totalFee: 0, collected: 0, balance: 0 });

    return totals;
  };

  const getAPIStats = () => {
    const stats = excelData.reduce((acc, row) => {
      if (row.APIStatus === 'success') acc.success++;
      else if (row.APIStatus === 'not_found') acc.notFound++;
      else if (row.APIStatus === 'error') acc.error++;
      else if (row.APIStatus === 'pending') acc.pending++;
      return acc;
    }, { success: 0, notFound: 0, error: 0, pending: 0 });

    return stats;
  };

  const totals = calculateTotals();
  const apiStats = getAPIStats();

  return (
    <div className="bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with user info and logout */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 relative">
                  <Image
                    src="/image.png"
                    alt="Daleel Logo"
                    fill
                    className="object-contain"
                    priority
                    onError={(e) => {
                      console.error('Image load error:', e);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Daleel Student Management</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Welcome, {user?.fullName?.en || user?.email || 'User'}
                  </p>
                  {user?.roles && user.roles.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Role: {user.roles.map(role => role.name.en).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {!isTokenExpired() && (
                    <span>
                      Session expires in: {Math.floor(getTimeUntilExpiry() / (1000 * 60 * 60))}h {Math.floor((getTimeUntilExpiry() % (1000 * 60 * 60)) / (1000 * 60))}m
                    </span>
                  )}
                </div>
                <button
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Excel Upload</h2>
            <p className="mt-1 text-sm text-gray-600">
              Upload an Excel file with columns: Min. No., Total Fee, Collected, and Balance
            </p>
            
            {/* API Status Notice */}
            <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">API Status</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>The Daleel API integration is now working correctly!</p>
                    <p className="mt-1"><strong>Features:</strong> Excel upload, data parsing, and student lookup from the Daleel system are all available.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Upload Area */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {isDragActive ? 'Drop the Excel file here' : 'Drag & drop an Excel file here'}
                  </p>
                  <p className="text-sm text-gray-500">or click to select a file</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Supports .xlsx, .xls, and .csv files
                  </p>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="mt-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Processing file...</span>
              </div>
            )}

            {/* API Processing State */}
            {isProcessingAPI && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Processing Student Data</h3>
                    <div className="mt-1 text-sm text-blue-700">
                      Processing {apiProgress.current} of {apiProgress.total} records... (2s delay between calls)
                    </div>
                    <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(apiProgress.current / apiProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Data Summary */}
            {excelData.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium text-gray-900">
                    Upload Summary
                  </h2>
                  <div className="flex space-x-3">
                    {reportUrl && (
                      <a
                        href={reportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        View Live Report
                      </a>
                    )}
                    <button
                      onClick={downloadAllStudentsWithStatus}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      Download Full Report
                    </button>
                    <button
                      onClick={() => setExcelData([])}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear Data
                    </button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-600">Total Records</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {excelData.length}
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-blue-600">Total Fee</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {totals.totalFee.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-green-600">Collected</div>
                    <div className="text-2xl font-bold text-green-900">
                      {totals.collected.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-orange-600">Balance</div>
                    <div className="text-2xl font-bold text-orange-900">
                      {totals.balance.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* API Processing Results */}
                {!isProcessingAPI && excelData.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-green-600">Found in System</div>
                      <div className="text-2xl font-bold text-green-900">
                        {apiStats.success}
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-yellow-600">Not Found</div>
                      <div className="text-2xl font-bold text-yellow-900">
                        {apiStats.notFound}
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-red-600">API Errors</div>
                      <div className="text-2xl font-bold text-red-900">
                        {apiStats.error}
                      </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-blue-600">Student GUIDs</div>
                      <div className="text-2xl font-bold text-blue-900">
                        {apiStats.success}
                      </div>
                    </div>
                  </div>
                )}

                {/* Update Controls */}
                {!isProcessingAPI && apiStats.success > 0 && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Update Students</h3>
                      <div className="flex space-x-3">
                        <button
                          onClick={downloadFailedStudents}
                          disabled={excelData.filter(row => row.APIStatus === 'error' || row.UpdateStatus === 'error').length === 0}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Download Failed Students
                        </button>
                        <button
                          onClick={updateAllStudents}
                          disabled={isUpdating}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isUpdating ? 'Updating...' : 'Update All Students'}
                        </button>
                      </div>
                    </div>
                    
                    {isUpdating && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Updating students... (2s delay between calls)</span>
                          <span>{updateProgress.current} / {updateProgress.total}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(updateProgress.current / updateProgress.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Update Results */}
                    {!isUpdating && excelData.some(row => row.UpdateStatus) && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-green-600">Updated Successfully</div>
                          <div className="text-xl font-bold text-green-900">
                            {excelData.filter(row => row.UpdateStatus === 'success').length}
                          </div>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-red-600">Update Failed</div>
                          <div className="text-xl font-bold text-red-900">
                            {excelData.filter(row => row.UpdateStatus === 'error').length}
                          </div>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-yellow-600">Pending Update</div>
                          <div className="text-xl font-bold text-yellow-900">
                            {excelData.filter(row => row.UpdateStatus === 'pending').length}
                          </div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-orange-600">Total Failed</div>
                          <div className="text-xl font-bold text-orange-900">
                            {excelData.filter(row => row.APIStatus === 'error' || row.UpdateStatus === 'error').length}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Student Data Table */}
                {!isProcessingAPI && excelData.length > 0 && (
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Student Data Overview</h3>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-500">
                          Last updated: {lastUpdated.toLocaleString()}
                        </div>
                        <button
                          onClick={refreshData}
                          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                          Refresh
                        </button>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-gray-600">Live Data</span>
                        </div>
                        {reportFilename && (
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm text-gray-600">Report: {reportFilename}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Ministry ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Admin No.
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Fee
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Collected
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Balance
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              API Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Update Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Student GUID
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {excelData.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {row['Min. No.']}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {row['Admn No.'] || '—'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {Number(row['Total Fee']).toLocaleString()}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {Number(row['Collected']).toLocaleString()}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {Number(row['Balance']).toLocaleString()}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  row.APIStatus === 'success' 
                                    ? 'bg-green-100 text-green-800'
                                    : row.APIStatus === 'not_found'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : row.APIStatus === 'error'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {row.APIStatus === 'success' ? '✓ Found' : 
                                   row.APIStatus === 'not_found' ? '⚠ Not Found' : 
                                   row.APIStatus === 'error' ? '✗ Error' : 
                                   row.APIStatus === 'pending' ? '⏳ Pending' : '—'}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {row.UpdateStatus ? (
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    row.UpdateStatus === 'success' 
                                      ? 'bg-green-100 text-green-800'
                                      : row.UpdateStatus === 'error'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {row.UpdateStatus === 'success' ? '✓ Updated' : 
                                     row.UpdateStatus === 'error' ? '✗ Failed' : '⏳ Pending'}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">—</span>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                {row.StudentGuid ? 
                                  `${row.StudentGuid.substring(0, 8)}...` : 
                                  '—'
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100">
                          <tr className="font-semibold">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              Total ({excelData.length} records)
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              —
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {totals.totalFee.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {totals.collected.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {totals.balance.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <span className="text-green-600">
                                {apiStats.success} found
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {excelData.filter(row => row.UpdateStatus === 'success').length > 0 && (
                                <span className="text-green-600">
                                  {excelData.filter(row => row.UpdateStatus === 'success').length} updated
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              —
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Student Details Section */}
                {!isProcessingAPI && excelData.some(row => row.StudentDetails) && (
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Detailed Student Information</h3>
                      <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                      >
                        {showDetails ? 'Hide Details' : 'Show Details'}
                      </button>
                    </div>
                    {showDetails && (
                    <div className="space-y-4">
                      {excelData
                        .filter(row => row.StudentDetails)
                        .map((row, index) => (
                          <div key={index} className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900">
                                Ministry No: {row['Min. No.']}
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-500">
                                  GUID: {row.StudentGuid}
                                </span>
                                {row.UpdateStatus && (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    row.UpdateStatus === 'success' 
                                      ? 'bg-green-100 text-green-800'
                                      : row.UpdateStatus === 'error'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {row.UpdateStatus === 'success' ? '✓ Updated' : 
                                     row.UpdateStatus === 'error' ? '✗ Failed' : '⏳ Pending'}
                                  </span>
                                )}
                              </div>
                            </div>
                            {row.UpdateMessage && (
                              <div className="mb-2 text-sm text-gray-600">
                                <strong>Update Status:</strong> {row.UpdateMessage}
                              </div>
                            )}
                            <div className="text-sm text-gray-600">
                              <pre className="whitespace-pre-wrap overflow-x-auto">
                                {JSON.stringify(row.StudentDetails, null, 2)}
                              </pre>
                            </div>
                          </div>
                        ))}
                    </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

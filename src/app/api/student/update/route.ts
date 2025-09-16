import { NextRequest, NextResponse } from 'next/server';
/* eslint-disable @typescript-eslint/no-explicit-any */

export async function PUT(request: NextRequest) {
  try {
    const { studentGuid, studentData, token, ownerId } = await request.json();

    if (!studentGuid) {
      return NextResponse.json({ error: 'Student GUID is required' }, { status: 400 });
    }

    if (!studentData) {
      return NextResponse.json({ error: 'Student data is required' }, { status: 400 });
    }

    if (!token || !ownerId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const apiBaseUrl = process.env.DALEEL_API_BASE_URL || 'https://api-daleel.spea.shj.ae';
    const yearId = process.env.DALEEL_YEAR_ID || '1052';

    // Ensure studentTalent array contains only talentId values
    if (studentData.studentTalent) {
      if (Array.isArray(studentData.studentTalent)) {
        // Filter out any null/undefined values and ensure they're numbers
        studentData.studentTalent = studentData.studentTalent
          .map((id: any) => Number(id))
          .filter((id: number) => !isNaN(id) && id > 0);
      } else {
        studentData.studentTalent = [];
      }
    } else {
      studentData.studentTalent = [];
    }
    
    // Ensure all nested objects have proper structure
    if (studentData.studentPayments && typeof studentData.studentPayments === 'object') {
      studentData.studentPayments = {
        fullAmountToBePaid: Number(studentData.studentPayments.fullAmountToBePaid) || 0,
        paidAmount: Number(studentData.studentPayments.paidAmount) || 0,
        remainingAmount: Number(studentData.studentPayments.remainingAmount) || 0,
        accountantComment: String(studentData.studentPayments.accountantComment || '')
      };
    }
    
    // Log the data being sent for debugging
    console.log('=== STUDENT UPDATE DATA ===');
    console.log('Student GUID:', studentGuid);
    console.log('Owner ID:', ownerId);
    console.log('Year ID:', yearId);
    console.log('Full Student Data:', JSON.stringify(studentData, null, 2));
    console.log('StudentTalent Array:', studentData.studentTalent);
    console.log('StudentPayments:', studentData.studentPayments);
    console.log('==========================');
    
    const response = await fetch(`${apiBaseUrl}/api/Student/${studentGuid}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'yearId': yearId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(studentData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('=== STUDENT UPDATE ERROR ===');
      console.error('Error Status:', response.status);
      console.error('Error Status Text:', response.statusText);
      console.error('Error Body:', errorText);
      console.log('============================');
      
      if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Authentication failed - JWT token may be expired', 
          details: 'Please contact support to refresh the API token',
          status: 'auth_error'
        }, { status: 401 });
      }
      
      return NextResponse.json({ 
        error: 'Student update failed', 
        details: errorText,
        status: response.status 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('=== STUDENT UPDATE SUCCESS ===');
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    console.log('==============================');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Student updated successfully',
      data: data 
    });
  } catch (error) {
    console.error('Student update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
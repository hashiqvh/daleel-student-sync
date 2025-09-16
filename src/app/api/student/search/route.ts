import { getAuthData } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { ministryNumber } = await request.json();

    if (!ministryNumber) {
      return NextResponse.json({ error: 'Ministry number is required' }, { status: 400 });
    }

    // Get token from authentication
    const authData = await getAuthData();
    if (!authData) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const apiBaseUrl = process.env.DALEEL_API_BASE_URL || 'https://api-daleel.spea.shj.ae';
    const yearId = process.env.DALEEL_YEAR_ID || '1052';

    const response = await fetch(`${apiBaseUrl}/api/Student/students/1413`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.token}`,
        'yearId': yearId,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        "KeyWord": ministryNumber,
        "Page": 1,
        "PageSize": 6,
        "SortBy": "",
        "SortColumn": "",
        "SortDirection": "",
        "SortColumnName": "",
        "schoolYearId": 1,
        "SchoolId": null,
        "curriculumId": null,
        "GradeId": null,
        "DivisionId": null,
        "TrackId": null,
        "NationalityId": null,
        "IsPassed": null,
        "StudentCategory": null,
        "IsChildOfAMartyr": null,
        "talentId": null,
        "IsSpecialAbilities": null,
        "IsInFusionClass": null,
        "IsSpecialClass": null,
        "StudentDegreeResultFilter": null,
        "gender": null,
        "StudentDaleel2Id": null,
        "StudentDaleel1Id": null,
        "StudentName": null,
        "StudentmanhalId": null,
        "emritid": null
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Authentication failed - JWT token may be expired', 
          details: 'Please contact support to refresh the API token',
          status: 'auth_error'
        }, { status: 401 });
      }
      
      return NextResponse.json({ 
        error: 'API request failed', 
        details: errorText,
        status: response.status 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('API Success Response:', data);
    
    if (data.result && data.result.data && data.result.data.length > 0) {
      return NextResponse.json({ 
        studentGuid: data.result.data[0].studentGuid, 
        status: 'success' 
      });
    } else {
      return NextResponse.json({ status: 'not_found' });
    }
  } catch (error) {
    console.error('Student search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
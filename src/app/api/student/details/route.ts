import { getAuthData } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

/* eslint-disable @typescript-eslint/no-explicit-any */

function transformStudentDetails(apiResponse: any, paymentData?: { totalFee?: string; collected?: string; balance?: string ,studentNumber?:string,grade?:string}) {
  const student = apiResponse?.result;
  
  if (!student) {
    throw new Error('Invalid API response: missing student data');
  }
  
  return {
    name: {
      ar: student.name?.ar || "",
      en: student.name?.en || ""
    },
    surname: {
      ar: student.surname?.ar || "",
      en: student.surname?.en || ""
    },
    TransfireYear: student.transfireYear || "",
    TransfireDivision: student.transfireDivision || "",
    NameINPassporEn: student.nameINPassporEn || "",
    NameINPassporAr: student.nameINPassporAr || "",
    birthDate: student.birthDate || null,
    placeOfBirth: student.placeOfBirth || "",
    gender: student.gender || "",
    nationalityId: student.nationality?.id || null,
    religionId: student.religion?.id || null,
    isTalented: "",
    isGifted: student.isGifted || null,
    transfireGradeId: student.transfireGradeId || null,
    reasonForNotHavingEmiratesId: student.reasonForNotHavingEmiratesId || null,
    hasShadower: student.hasShadower || false,
    daleelId: student.daleelId || "",
    studentNumber: paymentData?.studentNumber || null,
    ministerialId: student.ministerialId || null,
    manhalNumber: student.manhalNumber || null,
    isSpecialAbilities: student.isSpecialAbilities || false,
    isSpecialClass: student.isSpecialClass || false,
    isInFusionClass: student.isInFusionClass || false,
    isSpecialEducation: student.isSpecialEducation || null,
    specialEducation: {
      id: student.specialEducation?.id || null,
      name: {
        ar: student.specialEducation?.name?.ar || "",
        en: student.specialEducation?.name?.en || ""
      }
    },
    isChildOfAMartyr: student.isChildOfAMartyr || false,
    isHasInternet: student.isHasInternet || false,
    isHasPhone: student.isHasPhone || false,
    transportationType: student.transportationType || "",
    studentBehavior: {
      id: student.studentBehavior?.id || 0,
      descrition: student.studentBehavior?.descrition || null
    },
    nationalityCategory: {
      id: student.nationalityCategory?.id || null,
      name: {
        ar: student.nationalityCategory?.name?.ar || "",
        en: student.nationalityCategory?.name?.en || ""
      }
    },
    motherLanguage: {
      id: student.motherLanguage?.id || null,
      name: {
        ar: student.motherLanguage?.name?.ar || "",
        en: student.motherLanguage?.name?.en || ""
      }
    },
    languageAtHome: {
      id: student.languageAtHome?.id || null,
      name: {
        ar: student.languageAtHome?.name?.ar || "",
        en: student.languageAtHome?.name?.en || ""
      }
    },
    mostUsedLanguage: {
      id: student.mostUsedLanguage?.id || null,
      name: {
        ar: student.mostUsedLanguage?.name?.ar || "",
        en: student.mostUsedLanguage?.name?.en || ""
      }
    },
    guardianId: student.guardianId || null,
    studentPayments: {
      fullAmountToBePaid: paymentData?.totalFee ? parseFloat(paymentData.totalFee) : (student.studentPayments?.fullAmountToBePaid || 0),
      paidAmount: paymentData?.collected ? parseFloat(paymentData.collected) : (student.studentPayments?.paidAmount || 0),
      remainingAmount: paymentData?.balance ? parseFloat(paymentData.balance) : (student.studentPayments?.remainingAmount || 0),
      accountantComment: student.studentPayments?.accountantComment || ""
    },
    prohibited: {
      id: student.studentProhibited?.id || null,
      rCertificateFromSPEA: student.studentProhibited?.rCertificateFromSPEA || false,
      certificateFromSchool: student.studentProhibited?.certificateFromSchool || false,
      withdrawingFromSPEA: student.studentProhibited?.withdrawingFromSPEA || false,
      withdrawingFromSchool: student.studentProhibited?.withdrawingFromSchool || false,
      registration: student.studentProhibited?.registration || false
    },
    address: {
      id: student.address?.id || null,
      city: student.address?.city || "",
      emirate: student.address?.emirate || "",
      state: student.address?.state || ""
    },
    studentTalent: Array.isArray(student.studentTalents) 
      ? student.studentTalents.map((talent: any) => talent.talentId).filter((id: any) => id != null)
      : [],
    attendanceMode: student.attendanceMode || "",
    reEnrollmentStatus: student.reEnrollmentStatus || null,
    dateOfAcceptance: student.dateOfAcceptance || null,
    studentReEnrollmentId: student.reEnrollmentType?.id || null,
    parsonalImagePath: student.parsonalImagePath || null,
    relativeRelationId: student.relativeRelation?.id || null
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentGuid = searchParams.get('studentGuid');
    const totalFee = searchParams.get('totalFee');
    const collected = searchParams.get('collected');
    const balance = searchParams.get('balance');
    const studentNumber = searchParams.get('studentNumber');

    if (!studentGuid) {
      return NextResponse.json({ error: 'Student GUID is required' }, { status: 400 });
    }

    // Get token from authentication
    const authData = await getAuthData();
    if (!authData) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const apiBaseUrl = process.env.DALEEL_API_BASE_URL || 'https://api-daleel.spea.shj.ae';
    const yearId = process.env.DALEEL_YEAR_ID || '1052';

    const response = await fetch(`${apiBaseUrl}/api/Student/${studentGuid}?schoolYearId=`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authData.token}`,
        'yearId': yearId,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Student Details API Error Response:', {
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
    console.log('Student Details API Success Response:', data);
    
    try {
      // Transform the response to match the required model
      const paymentData = {
        totalFee: totalFee || undefined,
        collected: collected || undefined,
        balance: balance || undefined,
        studentNumber: studentNumber || undefined
      };
      const transformedData = transformStudentDetails(data, paymentData);
      return NextResponse.json(transformedData);
    } catch (transformError) {
      console.error('Data transformation error:', transformError);
      return NextResponse.json({ 
        error: 'Failed to transform student data', 
        details: transformError instanceof Error ? transformError.message : 'Unknown transformation error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Student details API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
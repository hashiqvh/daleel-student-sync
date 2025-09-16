import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Clear cookies by setting them with past expiry date
    const response = NextResponse.json({ message: 'Logged out successfully' });
    
    // Set cookies to expire immediately
    response.cookies.set('daleel_token', '', {
      expires: new Date(0),
      secure: true,
      sameSite: 'strict'
    });
    response.cookies.set('daleel_user', '', {
      expires: new Date(0),
      secure: true,
      sameSite: 'strict'
    });
    response.cookies.set('daleel_expires', '', {
      expires: new Date(0),
      secure: true,
      sameSite: 'strict'
    });

    return response;
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

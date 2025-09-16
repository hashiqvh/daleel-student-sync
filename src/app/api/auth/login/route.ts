import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const apiBaseUrl = process.env.DALEEL_API_BASE_URL || 'https://api-daleel.spea.shj.ae';

    // Call Daleel login API
    const response = await fetch(`${apiBaseUrl}/api/User/Auth/Login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Daleel Login API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      return NextResponse.json({ 
        error: 'Invalid credentials', 
        details: 'Please check your username and password'
      }, { status: 401 });
    }

    const data = await response.json();
    console.log('Daleel Login Success:', {
      ownerId: data.ownerId,
      userId: data.userId,
      tokenLength: data.token?.length,
      expires: data.expires
    });

    return NextResponse.json({
      ownerId: data.ownerId,
      userId: data.userId,
      token: data.token,
      user: data.user,
      expires: data.expires,
      claims: data.claims
    });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
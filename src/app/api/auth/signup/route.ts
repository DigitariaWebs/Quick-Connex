import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const userType = formData.get('userType');
    const firstName = formData.get('firstName');
    const lastName = formData.get('lastName');
    const email = formData.get('email');
    const phone = formData.get('phone');

    const userData: any = { userType, firstName, lastName, email, phone };

    if (userType === 'manager') {
      userData.post = formData.get('post');
      userData.class = formData.get('class');
    }

    if (userType === 'employee') {
      const opiqPermit = formData.get('opiqPermit') as File;
      const rcr = formData.get('rcr') as File;

      if (opiqPermit) {
        const opiqPermitBuffer = Buffer.from(await opiqPermit.arrayBuffer());
        const opiqPermitFilename = Date.now() + '-' + opiqPermit.name;
        await writeFile(
          path.join(process.cwd(), 'public/uploads', opiqPermitFilename),
          opiqPermitBuffer
        );
        userData.opiqPermit = `/uploads/${opiqPermitFilename}`;
      }

      if (rcr) {
        const rcrBuffer = Buffer.from(await rcr.arrayBuffer());
        const rcrFilename = Date.now() + '-' + rcr.name;
        await writeFile(
          path.join(process.cwd(), 'public/uploads', rcrFilename),
          rcrBuffer
        );
        userData.rcr = `/uploads/${rcrFilename}`;
      }
    }

    // TODO: Add your logic here:
    // 1. Validate the input data.
    // 2. Check if a user with the same email already exists in your database.
    // 3. Create the new user in your database (e.g., PostgreSQL, MongoDB).

    console.log('Received signup data:', userData);

    // Return a success response
    return NextResponse.json({ message: 'User registered successfully', data: userData }, { status: 201 });

  } catch (error) {
    console.error('Signup Error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}

import AuthFlowDebugger from '@/components/AuthFlowDebugger'
import LoginButton from '@/components/LoginButton'

export default function Home() {
    return (
        <div className='min-h-screen p-8 bg-gray-50'>
            <div className='max-w-4xl mx-auto'>
                <header className='text-center mb-8'>
                    <h1 className='text-4xl font-bold text-gray-900 mb-2'>Fithub Backend API Test</h1>
                    <p className='text-lg text-gray-600'>
                        Testing authentication flow with Firebase, Google OAuth, and GitHub OAuth
                    </p>
                </header>

                <div className='grid gap-8 md:grid-cols-2'>
                    {/* Simple Login Test */}
                    <div className='bg-white rounded-lg shadow-sm p-6'>
                        <h2 className='text-xl font-semibold mb-4'>Quick Authentication Test</h2>
                        <LoginButton />
                    </div>

                    {/* API Endpoints Info */}
                    <div className='bg-white rounded-lg shadow-sm p-6'>
                        <h2 className='text-xl font-semibold mb-4'>API Information</h2>
                        <div className='space-y-2 text-sm'>
                            <div>
                                <strong>Backend URL:</strong>
                                <code className='ml-2 px-2 py-1 bg-gray-100 rounded'>
                                    {process.env.NEXT_PUBLIC_API_URL}
                                </code>
                            </div>
                            <div>
                                <strong>Firebase Project:</strong>
                                <code className='ml-2 px-2 py-1 bg-gray-100 rounded'>
                                    {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}
                                </code>
                            </div>
                            <div className='pt-2'>
                                <strong>Auth Flow Steps:</strong>
                                <ol className='list-decimal list-inside mt-1 space-y-1 text-gray-600'>
                                    <li>Firebase Authentication (Google Sign-in)</li>
                                    <li>Backend verification + temp session</li>
                                    <li>Google OAuth (if needed)</li>
                                    <li>GitHub OAuth</li>
                                    <li>Complete account creation</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Flow Debugger */}
                <div className='mt-8 bg-white rounded-lg shadow-sm'>
                    <AuthFlowDebugger />
                </div>

                {/* Additional Info */}
                <footer className='mt-8 text-center text-sm text-gray-500'>
                    <p>
                        This is a test frontend for the Fithub backend API. Built with Next.js 15 and Firebase
                        Authentication.
                    </p>
                </footer>
            </div>
        </div>
    )
}

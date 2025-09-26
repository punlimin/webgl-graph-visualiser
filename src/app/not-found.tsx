import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <h1 className="text-6xl font-bold text-primary-700">404</h1>
            <p className="mt-4 text-base text-primary-600">
                Oops! The page you’re looking for doesn’t exist.
            </p>
            <Link
                href="/"
                className="mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
                Go back home
            </Link>
        </div>
    );
}

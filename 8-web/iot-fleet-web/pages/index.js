import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Loader from '../components/Loader';

const HomePage = () => {
    const router = useRouter();
    useEffect(() => {
            router.push('/login');
    }, [router]);
    return <Loader />
};

export default HomePage;

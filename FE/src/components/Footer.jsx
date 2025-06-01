import React, { useEffect, useState } from 'react';

const Footer = () => {
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setAnimate(true), 300);
        return () => clearTimeout(timer);
    }, []);

    return (
        <footer className={`bg-gray-900 text-white py-10 px-4 transition-opacity duration-700 ${animate ? 'opacity-100' : 'opacity-0'}`}>
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* About Section */}
                <div>
                    <h3 className="text-2xl font-bold mb-3">GameArena</h3>
                    <p className="text-gray-400 text-sm">
                        GameArena is your go-to platform for awesome services, top-notch content, and more. We aim to provide an exceptional experience every time you visit.
                    </p>
                </div>

                {/* Quick Links */}
                <div>
                    <h4 className="text-lg font-semibold mb-3">Quick Links</h4>
                    <ul className="space-y-2 text-gray-400">
                        <li><a href="#" className="hover:text-blue-500 transition">Home</a></li>
                        <li><a href="#" className="hover:text-blue-500 transition">About</a></li>
                        <li><a href="#" className="hover:text-blue-500 transition">Services</a></li>
                        <li><a href="#" className="hover:text-blue-500 transition">Contact</a></li>
                    </ul>
                </div>

                {/* Newsletter Subscription */}
                <div>
                    <h4 className="text-lg font-semibold mb-3">Subscribe</h4>
                    <p className="text-gray-400 text-sm mb-2">Get the latest updates and offers straight to your inbox.</p>
                    <form className="flex flex-col space-y-2">
                        <input
                            type="email"
                            placeholder="Your email address"
                            className="px-3 py-2 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 transition px-3 py-2 rounded text-white"
                        >
                            Subscribe
                        </button>
                    </form>
                </div>

                {/* Contact Info & Socials */}
                <div>
                    <h4 className="text-lg font-semibold mb-3">Contact Us</h4>
                    <p className="text-gray-400 text-sm mb-2">
                        Email: <a href="mailto:support@GameArena.com" className="hover:text-blue-500">support@GameArena.com</a><br />
                        Phone: <a href="tel:+1234567890" className="hover:text-blue-500">+1 (234) 567-890</a>
                    </p>
                    <div className="flex space-x-4 mt-3">
                        <a href="#" className="hover:text-blue-500 transition">FB</a>
                        <a href="#" className="hover:text-blue-500 transition">TW</a>
                        <a href="#" className="hover:text-blue-500 transition">IG</a>
                    </div>
                </div>
            </div>

            <div className="mt-8 border-t border-gray-700 pt-4 text-center text-gray-500 text-sm">
                © {new Date().getFullYear()} GameArena. All rights reserved.
            </div>
        </footer>
    );
};

export default Footer;

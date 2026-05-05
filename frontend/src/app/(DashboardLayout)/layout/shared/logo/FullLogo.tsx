"use client";

import Link from "next/link";
import Image from "next/image";

const FullLogo = () => {
  return (
    <Link href="/" className="flex items-center" aria-label="Invoxa">
      <Image
        src="/images/lockup-horizontal/invoxa-horizontal-light.svg"
        alt="Invoxa"
        width={140}
        height={40}
        priority
      />
    </Link>
  );
};

export default FullLogo;

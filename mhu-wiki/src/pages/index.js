import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import HomepageFeatures from "@site/src/components/HomepageFeatures";
import React from "react";

import Heading from "@theme/Heading";
import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header
      className={clsx(
        "hero hero--primary",
        styles.heroBanner,
        styles.heroGradient
      )}
    >
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg margin-right--md"
            to="/docs/docs/intro"
          >
            Get Started
          </Link>
          <Link
            className="button button--outline button--lg"
            href="mailto:medhi.matovu@gmail.com"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Welcome to ${siteConfig.title}`}
      description="Comprehensive documentation for the MHU Helpline CRM and Call Center System"
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <section className={styles.getStartedSection}>
          <div className="container text--center">
            <Heading as="h2">Ready to get started?</Heading>
            <p>
              Explore our documentation or reach out to our team for support.
            </p>
            <Link
              className="button button--primary button--lg"
              to="/docs/docs/intro"
            >
              Start Learning
            </Link>
          </div>
        </section>
        <section className={styles.testimonialSection}>
          <div className="container text--center">
            <Heading as="h2">What Our Users Say</Heading>
            <blockquote className={styles.testimonial}>
              <p>
                “The MHU Helpline CRM has transformed our call center
                operations. The documentation made onboarding and understanding
                the system a breeze!”
              </p>
              <footer>— Call Center Manager, MHU</footer>
            </blockquote>
          </div>
        </section>
      </main>
    </Layout>
  );
}

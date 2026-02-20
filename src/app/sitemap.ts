// src/app/sitemap.ts
import type { MetadataRoute } from 'next';

const BASE_URL = 'https://drivlet.com.au';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  // Core public pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/booking`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/track`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/policies`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/driver/join`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/garage/join`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Location city landing pages
  const cities = ['newcastle', 'canberra'];
  const cityPages: MetadataRoute.Sitemap = cities.map((city) => ({
    url: `${BASE_URL}/${city}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  // Newcastle suburb pages
  const newcastleSuburbs = [
    'charlestown', 'merewether', 'mayfield', 'lambton', 'adamstown',
    'jesmond', 'wallsend', 'hamilton', 'broadmeadow', 'kotara',
    'waratah', 'new-lambton', 'belmont', 'lake-macquarie', 'maitland',
  ];
  const newcastleSuburbPages: MetadataRoute.Sitemap = newcastleSuburbs.map((suburb) => ({
    url: `${BASE_URL}/newcastle/${suburb}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Canberra suburb pages
  const canberraSuburbs = [
    'belconnen', 'woden', 'tuggeranong', 'gungahlin', 'weston-creek',
    'kingston', 'braddon', 'fyshwick', 'mitchell', 'phillip',
  ];
  const canberraSuburbPages: MetadataRoute.Sitemap = canberraSuburbs.map((suburb) => ({
    url: `${BASE_URL}/canberra/${suburb}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...cityPages,
    ...newcastleSuburbPages,
    ...canberraSuburbPages,
  ];
}
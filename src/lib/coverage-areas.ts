export interface District {
  name: string;
  suburbs: string[];
}

export interface CoverageRegion {
  id: string;
  name: string;
  stateShort: string;
  districts: District[];
}

export const CANBERRA_COVERAGE: CoverageRegion[] = [
  {
    id: 'canberra',
    name: 'Canberra',
    stateShort: 'ACT',
    districts: [
      {
        name: 'North Canberra',
        suburbs: [
          'Acton', 'Ainslie', 'Braddon', 'Campbell', 'Dickson', 'Downer',
          'Hackett', 'Lyneham', "O'Connor", 'Reid', 'Turner', 'Watson',
        ],
      },
      {
        name: 'South Canberra (Inner South)',
        suburbs: [
          'Barton', 'Deakin', 'Forrest', 'Griffith', 'Kingston',
          'Narrabundah', 'Red Hill', 'Yarralumla',
        ],
      },
      {
        name: 'Belconnen',
        suburbs: [
          'Aranda', 'Belconnen', 'Bruce', 'Charnwood', 'Cook', 'Dunlop',
          'Evatt', 'Florey', 'Flynn', 'Fraser', 'Giralang', 'Hawker',
          'Higgins', 'Holt', 'Kaleen', 'Latham', 'Lawson', 'Macquarie',
          'McKellar', 'Melba', 'Page', 'Scullin', 'Spence', 'Weetangera',
        ],
      },
      {
        name: 'Gungahlin',
        suburbs: [
          'Amaroo', 'Bonner', 'Casey', 'Crace', 'Forde', 'Franklin',
          'Gungahlin', 'Harrison', 'Jacka', 'Moncrieff', 'Ngunnawal',
          'Nicholls', 'Palmerston', 'Taylor', 'Throsby', 'Yerrabi',
        ],
      },
      {
        name: 'Woden Valley',
        suburbs: [
          'Chifley', 'Curtin', 'Garran', 'Hughes', 'Isaacs', 'Lyons',
          'Mawson', "O'Malley", 'Pearce', 'Phillip', 'Torrens',
        ],
      },
      {
        name: 'Weston Creek',
        suburbs: [
          'Chapman', 'Duffy', 'Fisher', 'Holder', 'Rivett', 'Stirling',
          'Waramanga', 'Weston',
        ],
      },
      {
        name: 'Molonglo Valley',
        suburbs: [
          'Coombs', 'Denman Prospect', 'Molonglo', 'Whitlam', 'Wright',
        ],
      },
      {
        name: 'Tuggeranong',
        suburbs: [
          'Banks', 'Bonython', 'Calwell', 'Chisholm', 'Conder', 'Fadden',
          'Gilmore', 'Gordon', 'Greenway', 'Isabella Plains', 'Kambah',
          'Macarthur', 'Monash', 'Oxley', 'Richardson', 'Theodore',
          'Wanniassa',
        ],
      },
      {
        name: 'Canberra East / Jerrabomberra District',
        suburbs: ['Beard', 'Hume', 'Oaks Estate', 'Symonston'],
      },
    ],
  },
  {
    id: 'queanbeyan',
    name: 'Queanbeyan Region',
    stateShort: 'NSW',
    districts: [
      {
        name: 'Queanbeyan & surrounds',
        suburbs: [
          'Queanbeyan', 'Queanbeyan East', 'Queanbeyan West', 'Karabar',
          'Crestwood', 'Greenleigh', 'The Ridgeway', 'Googong', 'Tralee',
          'Environa', 'Jerrabomberra',
        ],
      },
    ],
  },
];

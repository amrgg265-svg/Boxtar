// ==========================================
// 1. تشغيل سيرفر الـ Keep-Alive
// ==========================================
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.status(200).send('Boxtar Bot is active! 🚀');
});

app.get('/ping', (req, res) => {
  res.status(200).send('PONG');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

// ==========================================
// 2. كود بوت ديسكورد الشامل والكامل بجميع الأنظمة
// ==========================================
const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  EmbedBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} = require('discord.js');

const { createCanvas, loadImage } = require('@napi-rs/canvas');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

const afkUsers = new Map();
const logChannels = new Map();
const ticketData = new Map();         
const applicationsData = new Map(); 
const customShortcuts = new Map();    
const commandRoles = new Map();        

// نظام التحذيرات المحدث (${guildId}_${userId} -> array of warnings)
const userWarnings = new Map();

// إعدادات ونظام اللفلات المحدث
const levelSettings = new Map();   
const userLevels = new Map();      

const azkarSettings = new Map();
const protectionSettings = new Map();

const jailSettings = new Map(); 
const jailedUsers = new Map();  

const badWordsDB = new Map(); 
const badWordsPunishment = new Map(); 

// خريطة إضافية لتخزين إعدادات التذاكر الشاملة لكل سيرفر
const ticketConfigs = new Map(); 
// خريطة لتخزين بيانات التذاكر المفتوحة حالياً (المستلم، صاحب التذكرة، الحالة، إلخ)
const activeTickets = new Map();

const azkarList = [
  "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ العَظِيمِ.",
  "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ العَلِيِّ العَظِيمِ.",
  "أَسْتَغْفِرُ اللَّهَ العَظِيمَ وَأَتُوبُ إِلَيْهِ.",
  "لَا إِلَهَ إِلَّا اللَّه وحدَهُ لا شريكَ لهُ، لهُ الملكُ ولهُ الحمدُ وهوَ على كلِّ شيءٍ قديرٌ.",
  "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ."
];

const commands = [
  new SlashCommandBuilder()
    .setName('admin-setup')
    .setDescription('تحديد الرتب المصرح لها باستخدام الأوامر الإدارية')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('shortcut')
    .setDescription('لوحة أزرار تفاعلية لإنشاء وإدارة اختصارات جميع الأوامر الإدارية')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('تقديم').setDescription('إدارة وتخصيص لوحات التقديم الأربعة (5 أسئلة، بانر، رتبة قبول، وروم الاستقبال)'),
  new SlashCommandBuilder().setName('ticket-setup').setDescription('تخصيص وإعداد لوحة الدعم والتذاكر'),
  new SlashCommandBuilder()
    .setName('logs')
    .setDescription('إعداد وتحديد قنوات السجلات الخاصة والإجراءات والتذاكر')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('level-setup')
    .setDescription('إعداد وتخصيص نظام اللفلات، تفعيل/إيقاف، XP الرسائل، ورومات الصوت')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('level')
    .setDescription('عرض بطاقة اللفل المصورة وإحصائيات الـ XP')
    .addUserOption(opt => opt.setName('العضو').setDescription('اختر العضو لعرض لفله').setRequired(false)),

  new SlashCommandBuilder()
    .setName('top')
    .setDescription('عرض قائمة أعلى 10 أشخاص لفلات وأكس بي في السيرفر')
    .addStringOption(opt => 
      opt.setName('الفترة')
        .setDescription('اختر نطاق الفترة الزمنية للترتيب')
        .setRequired(false)
        .addChoices(
          { name: 'آخر يوم', value: 'day' },
          { name: 'آخر أسبوع', value: 'week' },
          { name: 'آخر شهر', value: 'month' },
          { name: 'الكل (دائم)', value: 'all' }
        )
    ),

  new SlashCommandBuilder()
    .setName('reset-all-levels')
    .setDescription('تصفير وتثبيت XP واللفلات لجميع أعضاء السيرفر إلى الصفر')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('add-xp')
    .setDescription('إضافة أو منح كمية محددة من الـ XP لعضو معين')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو').setRequired(true))
    .addIntegerOption(opt => opt.setName('الكمية').setDescription('عدد نقاط الـ XP المراد إضافتها').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('reset-member-xp')
    .setDescription('إعادة تعيين (تصفير) XP ولفل عضو محدد ليصبح صفر')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المراد تصفير لفله').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('afk')
    .setDescription('تفعيل وضع الغياب AFK')
    .addStringOption(opt => opt.setName('سبب').setDescription('سبب الغياب (اختياري)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('bad-words')
    .setDescription('لوحة التحكم الكاملة بالكلمات المحظورة والعقوبات التلقائية')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('azkar-setup')
    .setDescription('إعداد وتفعيل نظام الأذكار التلقائية في السيرفر')
    .addChannelOption(opt => opt.setName('القناة').setDescription('اختر قناة الأذكار').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addIntegerOption(opt => 
      opt.setName('الساعات')
        .setDescription('الفاصل الزمني بين كل ذكر والآخر بالساعات')
        .setRequired(true)
        .addChoices(
          { name: 'ساعة واحدة', value: 1 },
          { name: 'ساعتان', value: 2 },
          { name: '3 ساعات', value: 3 },
          { name: '6 ساعات', value: 6 },
          { name: '12 ساعة', value: 12 },
          { name: '24 ساعة (يومياً)', value: 24 }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('azkar').setDescription('إرسال ذكر عشوائي فوراً في القناة الحالية'),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('حظر عضو من السيرفر')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المراد حظره').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('أدخل سبب الحظر').setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('طرد عضو من السيرفر')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المراد طرده').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('أدخل سبب الطرد').setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('كتم عضو مؤقتاً')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المراد كتمه').setRequired(true))
    .addIntegerOption(opt => 
      opt.setName('المدة')
        .setDescription('حدد مدة الكتم')
        .setRequired(true)
        .addChoices(
          { name: '5 دقائق', value: 5 * 60 * 1000 },
          { name: '10 دقائق', value: 10 * 60 * 1000 },
          { name: '1 ساعة', value: 60 * 60 * 1000 },
          { name: '1 يوم', value: 24 * 60 * 60 * 1000 },
          { name: '1 أسبوع', value: 7 * 24 * 60 * 60 * 1000 }
        )
    )
    .addStringOption(opt => opt.setName('السبب').setDescription('أدخل سبب الكتم').setRequired(true)),

  new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('إلغاء الكتم المؤقت عن العضو')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('سبب رفع الكتم').setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('إرسال تحذير إداري لعضو')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المراد تحذيره').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('أدخل سبب التحذير').setRequired(true)),

  new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('إزالة جميع التحذيرات عن العضو المحدد')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو').setRequired(true)),

  new SlashCommandBuilder()
    .setName('warnings-all')
    .setDescription('عرض جميع التحذيرات والأعضاء الذين عليهم تحذيرات في السيرفر'),

  new SlashCommandBuilder()
    .setName('warnings-member')
    .setDescription('عرض تحذيرات عضو محدد')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو لعرض تحذيراته').setRequired(true)),

  new SlashCommandBuilder()
    .setName('warnings-clear-all')
    .setDescription('حذف جميع التحذيرات المسجلة في السيرفر دفعة واحدة')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('nick')
    .setDescription('تغيير لقب العضو في السيرفر')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو').setRequired(true))
    .addStringOption(opt => opt.setName('اللقب_الجديد').setDescription('اكتب اللقب الجديد').setRequired(true)),

  new SlashCommandBuilder()
    .setName('protection')
    .setDescription('لوحة إعدادات حماية السيرفر (السبام والروابط)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('jail-setup')
    .setDescription('لوحة إعداد نظام السجن الشامل')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('jail')
    .setDescription('سجن عضو وسحب كافة رتبه وتوثيق السجل')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المسجون').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('سبب السجن').setRequired(true)),

  new SlashCommandBuilder()
    .setName('unjail')
    .setDescription('إفراج عن عضو مسجون وإعادة رتبه السابقة')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو للإفراج عنه').setRequired(true)),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('مسح عدد محدد من الرسائل في الروم')
    .addIntegerOption(opt => opt.setName('العدد').setDescription('من 1 إلى 100').setRequired(true)),
  
  new SlashCommandBuilder().setName('lock').setDescription('قفل الروم الحالية'),
  new SlashCommandBuilder().setName('unlock').setDescription('فتح الروم الحالية'),
  new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),

  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('عرض صورة الحساب')
    .addUserOption(opt => opt.setName('العضو').setDescription('اختر العضو لعرض صورته').setRequired(false)),

  new SlashCommandBuilder()
    .setName('user-info')
    .setDescription('عرض تفاصيل الحساب')
    .addUserOption(opt => opt.setName('العضو').setDescription('اختر العضو لعرض معلوماته').setRequired(false)),

  new SlashCommandBuilder().setName('server-info').setDescription('عرض معلومات السيرفر'),
  new SlashCommandBuilder().setName('help').setDescription('يعرض لك دليل وقائمة بجميع أوامر البوت ووظائفها بالتفصيل')
];

async function sendLog(guild, logType, title, color, fields) {
  const guildLogs = logChannels.get(guild.id);
  if (!guildLogs || !guildLogs[logType]) return;
  const channel = guild.channels.cache.get(guildLogs[logType]);
  if (!channel) return;

  const logEmbed = new EmbedBuilder()
    .setTitle(title)
    .addFields(fields)
    .setColor(color)
    .setTimestamp();

  await channel.send({ embeds: [logEmbed] }).catch(() => {});
}

function getRequiredXp(level) {
  return Math.floor(200 * Math.pow(1.2, level));
}

function canPunish(executor, target) {
  if (executor.id === target.id) return false; 
  if (executor.id === executor.guild.ownerId) return true; 
  if (target.id === executor.guild.ownerId) return false; 
  return executor.roles.highest.position > target.roles.highest.position;
}

function canManageLevels(member) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const currentSet = levelSettings.get(member.guild.id);
  if (currentSet && currentSet.managerRoleId && member.roles.cache.has(currentSet.managerRoleId)) {
    return true;
  }
  return false;
}

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName, options, guild, member, channel } = interaction;

      if (commandName === 'reset-all-levels') {
        if (!canManageLevels(member)) {
          return interaction.reply({ content: '❌ عذراً، لا تمتلك الصلاحية أو الرتبة المخصصة لتعديل إعدادات أو لفلات السيرفر!', ephemeral: true });
        }
        let count = 0;
        for (const key of userLevels.keys()) {
          if (key.startsWith(`${guild.id}_`)) {
            userLevels.set(key, { xp: 0, level: 0 });
            count++;
          }
        }
        return interaction.reply({ content: `✅ تم تصفير وإعادة تعيين نقاط الـ XP واللفلات لجميع الأعضاء (${count} عضو) إلى الصفر بنجاح.`, ephemeral: true });
      }

      if (commandName === 'add-xp') {
        if (!canManageLevels(member)) {
          return interaction.reply({ content: '❌ عذراً، لا تمتلك الصلاحية أو الرتبة المخصصة للتحكم باللفلات!', ephemeral: true });
        }
        const user = options.getUser('العضو');
        const amount = options.getInteger('الكمية');
        const key = `${guild.id}_${user.id}`;
        let userData = userLevels.get(key) || { xp: 0, level: 0 };
        
        userData.xp += amount;
        let nextXp = getRequiredXp(userData.level);
        while (userData.xp >= nextXp) {
          userData.xp -= nextXp;
          userData.level += 1;
          nextXp = getRequiredXp(userData.level);
        }
        userLevels.set(key, userData);

        return interaction.reply({ content: `✅ تم إضافة **${amount} XP** للعضو ${user}. أصبح مستواه الحالي: **${userData.level}** ومجموع نقاطه الحالية: **${userData.xp}**`, ephemeral: true });
      }

      if (commandName === 'reset-member-xp') {
        if (!canManageLevels(member)) {
          return interaction.reply({ content: '❌ عذراً، لا تمتلك الصلاحية أو الرتبة المخصصة لتعديل اللفلات!', ephemeral: true });
        }
        const user = options.getUser('العضو');
        const key = `${guild.id}_${user.id}`;
        userLevels.set(key, { xp: 0, level: 0 });

        return interaction.reply({ content: `✅ تم تصفير وإعادة تعيين XP ولفل العضو ${user} ليصبحان **صفر** بنجاح.`, ephemeral: true });
      }

      if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('🤖 دليل وقائمة أوامر ونقاط القوة في بوت Boxtar الشاملة')
          .setDescription('أهلاً بك يا عمرو! إليك شرح تفصيلي لجميع الأوامر والميزات المتاحة في البوت:')
          .addFields(
            { 
              name: '⭐ نظام اللفلات والتفاعل (Levels & XP)', 
              value: '`/level-setup` (تفعيل/إيقاف، تحديد XP الرسائل، تفعيل رومات الصوت، وتحديد رتبة المشرفين)\n`/level` أو `?level` (عرض بطاقة اللفل المصورة وسرعة التقدم - مع زيادة 20% لكل لفل)\n`/top` (عرض قائمة الترتيب لأعلى 10 أعضاء مع خيارات الفترة: يوم، أسبوع، شهر، الكل)\n`/reset-all-levels`, `/add-xp`, `/reset-member-xp` (أوامر الإدارة الجديدة لللفلات)', 
              inline: false 
            },
            { 
              name: '📂 نظام التقديمات المطوّر (4 تقديمات)', 
              value: '`/تقديم` : إعداد اسم التقديم والبانر، تعيين الـ 5 أسئلة، رتبة القبول، وروم استقبال الطلبات مع أزرار الموافقة والرفض الفورية.', 
              inline: false 
            },
            { 
              name: '⛓️ نظام السجن المتكامل والمحدث', 
              value: '`/jail-setup` (تحديد رتبة السجين والسجان ورومات السجل)\n`/jail` و `/unjail` (سجن وإفراج الأعضاء مع حفظ الرتب السابقة تلقائياً)', 
              inline: false 
            },
            { 
              name: '⚠️ نظام التحذيرات والسجلات الإدارية', 
              value: '`/warn` (تحذير الأعضاء وتوثيق السجل)\n`/unwarn` (إزالة كافة التحذيرات عن العضو)\n`/warnings-all` (عرض كافة التحذيرات في السيرفر)\n`/warnings-member` (عرض تحذيرات عضو محدد)\n`/warnings-clear-all` (حذف جميع التحذيرات)', 
              inline: false 
            },
            { 
              name: '⚡ الأوامر الإدارية والاختصارات', 
              value: '`/shortcut` (إنشاء اختصارات للأوامر الإدارية مثل `!k` أو `!b`)\n`/admin-setup`, `/ban`, `/kick`, `/timeout`, `/clear`, `/lock`, `/unlock`', 
              inline: false 
            }
          )
          .setFooter({ text: 'تم البرمجة والتطوير بواسطة Boxtar System' })
          .setTimestamp();

        return interaction.reply({ embeds: [helpEmbed], ephemeral: true });
      }

      if (commandName === 'top') {
        await interaction.deferReply();
        const period = options.getString('الفترة') || 'all';

        const guildUsers = Array.from(userLevels.entries())
          .filter(([key]) => key.startsWith(`${guild.id}_`))
          .map(([key, data]) => {
            const userId = key.split('_')[1];
            return { userId, ...data };
          })
          .sort((a, b) => b.xp - a.xp)
          .slice(0, 10);

        if (guildUsers.length === 0) {
          return interaction.editReply({ content: '❌ لا توجد أي بيانات لفلات مسجلة في هذا السيرفر حتى الآن.' });
        }

        const periodNames = {
          day: 'آخر يوم 📅',
          week: 'آخر أسبوع 📊',
          month: 'آخر شهر 🗓️',
          all: 'الكل (دائم) 🏆'
        };

        let descText = `🏆 **أبرز 10 أعضاء تفاعلاً في السيرفر**\n*الفترة الزمنية: ${periodNames[period]}*\n\n`;
        
        guildUsers.forEach((u, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `\`#${index + 1}\``;
          descText += `${medal} <@${u.userId}> ➔ المستوى: **${u.level}** | الـ XP: **${u.xp}**\n`;
        });

        const embed = new EmbedBuilder()
          .setTitle('📊 لوحة المتصدرين (Top Leaderboard)')
          .setDescription(descText)
          .setColor(0xE74C3C)
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      if (commandName === 'bad-words') {
        await interaction.deferReply({ ephemeral: true });
        const currentPunish = badWordsPunishment.get(guild.id) || 'delete';
        const wordsSet = badWordsDB.get(guild.id) || new Set();

        const embed = new EmbedBuilder()
          .setTitle('🚫 لوحة تحكم الكلمات المحظورة (Bad Words)')
          .setDescription(`إجمالي الكلمات: **${wordsSet.size}**\nالعقوبة: \`${currentPunish.toUpperCase()}\``)
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('bw_add_word').setLabel('إضافة كلمة').setEmoji('➕').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('bw_list_words').setLabel('عرض الكلمات').setEmoji('📋').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('bw_set_punishment').setLabel('تحديد العقوبة').setEmoji('⚖️').setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('bw_remove_word').setLabel('إزالة كلمة').setEmoji('➖').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('bw_clear_all').setLabel('إفراغ الكل').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
        );

        return interaction.editReply({ embeds: [embed], components: [row1, row2] });
      }

      if (commandName === 'shortcut') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle('⚡ لوحة إدارة اختصارات الأوامر الإدارية')
          .setDescription('اختر الإجراء أدناه لإدارة الاختصارات:')
          .setColor(0xE74C3C);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('sc_create').setLabel('إنشاء اختصار جديد').setEmoji('🔗').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('sc_list').setLabel('عرض الاختصارات').setEmoji('📜').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('sc_delete').setLabel('حذف اختصار').setEmoji('❌').setStyle(ButtonStyle.Danger)
        );

        return interaction.editReply({ embeds: [embed], components: [row] });
      }

      if (commandName === 'protection') {
        await interaction.deferReply({ ephemeral: true });
        const currentProt = protectionSettings.get(guild.id) || { antiSpam: false, antiLinks: false };

        const embed = new EmbedBuilder()
          .setTitle('🛡️ لوحة نظام الحماية الفعّال')
          .setDescription('تحقّق وتحكم بحماية السيرفر عبر الأزرار أدناه:')
          .addFields(
            { name: '🚫 حماية الروابط:', value: currentProt.antiLinks ? '✅ **مفعل**' : '❌ **متوقف**', inline: true },
            { name: '⚡ حماية السبام:', value: currentProt.antiSpam ? '✅ **مفعل**' : '❌ **متوقف**', inline: true }
          )
          .setColor(0xE74C3C);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('prot_toggle_links').setLabel(currentProt.antiLinks ? 'إيقاف حماية الروابط' : 'تفعيل حماية الروابط').setStyle(currentProt.antiLinks ? ButtonStyle.Danger : ButtonStyle.Success),
          new ButtonBuilder().setCustomId('prot_toggle_spam').setLabel(currentProt.antiSpam ? 'إيقاف حماية السبام' : 'تفعيل حماية السبام').setStyle(currentProt.antiSpam ? ButtonStyle.Danger : ButtonStyle.Success)
        );

        return interaction.editReply({ embeds: [embed], components: [row] });
      }

      if (commandName === 'jail-setup') {
        await interaction.deferReply({ ephemeral: true });
        const jSettings = jailSettings.get(guild.id) || {};

        const roleName = jSettings.roleId ? `<@&${jSettings.roleId}>` : 'غير محدد ❌';
        const jailerName = jSettings.jailerRoleId ? `<@&${jSettings.jailerRoleId}>` : 'غير محدد ⚠️';
        const textChanName = jSettings.textChannelId ? `<#${jSettings.textChannelId}>` : 'غير محدد ❌';
        const logChanName = jSettings.logChannelId ? `<#${jSettings.logChannelId}>` : 'غير محدد ❌';

        const embed = new EmbedBuilder()
          .setTitle('⛓️ لوحة إعداد نظام السجن المتكامل')
          .setDescription('قم بتخصيص إعدادات السجن عبر القوائم التفاعلية أدناه:')
          .addFields(
            { name: '🏷️ رتبة السجين:', value: roleName, inline: true },
            { name: '🛡️ رتبة السجان:', value: jailerName, inline: true },
            { name: '💬 روم كتابة السجناء:', value: textChanName, inline: true },
            { name: '📋 قناة سجل السجن:', value: logChanName, inline: true }
          )
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId('jail_set_role').setPlaceholder('1️⃣ اختر رتبة السجين...'));
        const row2 = new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId('jail_set_jailer_role').setPlaceholder('2️⃣ اختر رتبة السجان...'));
        const row3 = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('jail_set_text_channel').setPlaceholder('3️⃣ اختر روم الكتابة للسجناء...').addChannelTypes(ChannelType.GuildText));
        const row4 = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('jail_set_log_channel').setPlaceholder('4️⃣ اختر قناة سجل السجن...').addChannelTypes(ChannelType.GuildText));

        return interaction.editReply({ embeds: [embed], components: [row1, row2, row3, row4] });
      }

      if (commandName === 'jail') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);
        const jSettings = jailSettings.get(guild.id);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود في السيرفر.', ephemeral: true });
        if (!canPunish(member, targetMember)) return interaction.reply({ content: '❌ عذراً، لا يمكنك معاقبة نفسك أو شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });
        if (!jSettings || !jSettings.roleId) return interaction.reply({ content: '❌ لم يتم إعداد رتبة السجن بعد!', ephemeral: true });

        if (jSettings.jailerRoleId && !member.permissions.has(PermissionFlagsBits.Administrator)) {
          if (!member.roles.cache.has(jSettings.jailerRoleId)) {
            return interaction.reply({ content: '❌ عذراً، أنت لا تمتلك رتبة السجان.', ephemeral: true });
          }
        }

        const memberRoles = targetMember.roles.cache.filter(r => r.id !== guild.id && r.id !== jSettings.roleId).map(r => r.id);
        const removedRoleMentions = memberRoles.map(rId => `<@&${rId}>`).join(', ') || 'لا توجد رتب أُزيلت';

        jailedUsers.set(`${guild.id}_${user.id}`, memberRoles);
        await targetMember.roles.remove(memberRoles).catch(() => {});
        await targetMember.roles.add(jSettings.roleId).catch(() => {});

        if (jSettings.textChannelId) {
          const jailTextChan = guild.channels.cache.get(jSettings.textChannelId);
          if (jailTextChan) {
            jailTextChan.send(`🚨 مرحباً ${targetMember}، لقد تم زجك في السجن. السبب: **${reason}**`).catch(() => {});
          }
        }

        await sendLog(guild, 'jail', '⛓️ سجل سجن عضو جديد', 0xE74C3C, [
          { name: '👤 العضو المعاقب:', value: `${user} (${user.tag})`, inline: false },
          { name: '📝 سبب العقوبة:', value: reason, inline: false },
          { name: '🛡️ الإداري:', value: `${interaction.user} (${interaction.user.tag})`, inline: false },
          { name: '🏷️ الرتب المزالة:', value: removedRoleMentions, inline: false }
        ]);

        return interaction.reply({ content: `✅ تم سجن العضو **${user.tag}** بنجاح.`, ephemeral: true });
      }

      if (commandName === 'unjail') {
        const user = options.getUser('العضو');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);
        const jSettings = jailSettings.get(guild.id);
        const savedRoles = jailedUsers.get(`${guild.id}_${user.id}`);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
        if (!canPunish(member, targetMember)) return interaction.reply({ content: '❌ عذراً، لا يمكنك تنفيذ هذا الإجراء على شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });
        if (!jSettings || !jSettings.roleId) return interaction.reply({ content: '❌ نظام السجن غير معدل.', ephemeral: true });

        await targetMember.roles.remove(jSettings.roleId).catch(() => {});
        if (savedRoles && savedRoles.length > 0) {
          await targetMember.roles.add(savedRoles).catch(() => {});
          jailedUsers.delete(`${guild.id}_${user.id}`);
        }

        await sendLog(guild, 'jail', '🔓 سجل الإفراج عن مسجون', 0x2ECC71, [
          { name: '👤 العضو المُفرج عنه:', value: `${user} (${user.tag})`, inline: false },
          { name: '🛡️ الإداري بواسطة:', value: `${interaction.user} (${interaction.user.tag})`, inline: false }
        ]);

        return interaction.reply({ content: `✅ تم فك سجن العضو **${user.tag}** وإعادة رتبه.`, ephemeral: true });
      }

      if (commandName === 'nick') {
        const user = options.getUser('العضو');
        const newNick = options.getString('اللقب_الجديد');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
        if (!canPunish(member, targetMember)) return interaction.reply({ content: '❌ عذراً، لا يمكنك تغيير لقب شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });
        
        await targetMember.setNickname(newNick).catch(() => {});
        return interaction.reply({ content: `✅ تم تغيير لقب العضو ${user.tag} إلى **${newNick}**.`, ephemeral: true });
      }

      if (commandName === 'untimeout') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
        if (!canPunish(member, targetMember)) return interaction.reply({ content: '❌ عذراً، لا يمكنك رفع الكتم عن شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });

        await targetMember.timeout(null, reason).catch(() => {});
        
        await sendLog(guild, 'timeout', '🔊 سجل رفع الكتم (Untimeout)', 0x2ECC71, [
          { name: '👤 العضو المرفع عنه الكتم:', value: `${user} (${user.tag})`, inline: false },
          { name: '📝 السبب:', value: reason, inline: false },
          { name: '🛡️ الإداري:', value: `${interaction.user} (${interaction.user.tag})`, inline: false }
        ]);

        return interaction.reply({ content: `✅ تم رفع الكتم عن العضو **${user.tag}**.`, ephemeral: true });
      }

      if (commandName === 'warn') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
        if (!canPunish(member, targetMember)) return interaction.reply({ content: '❌ عذراً، لا يمكنك تحذير نفسك أو شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });

        const key = `${guild.id}_${user.id}`;
        let warns = userWarnings.get(key) || [];
        warns.push({ reason, admin: interaction.user.tag, date: Date.now() });
        userWarnings.set(key, warns);

        await sendLog(guild, 'warn', '⚠️ سجل تحذير جديد (Warn)', 0xE74C3C, [
          { name: '👤 العضو المعاقب:', value: `${user} (${user.tag})`, inline: false },
          { name: '📝 سبب العقوبة:', value: reason, inline: false },
          { name: '🛡️ الإداري:', value: `${interaction.user} (${interaction.user.tag})`, inline: false },
          { name: '📊 إجمالي التحذيرات:', value: `${warns.length} تحذيرات`, inline: false }
        ]);

        return interaction.reply({ content: `✅ تم إصدار تحذير للعضو **${user.tag}** بنجاح.`, ephemeral: true });
      }

      if (commandName === 'unwarn') {
        const user = options.getUser('العضو');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);

        if (targetMember && !canPunish(member, targetMember)) {
          return interaction.reply({ content: '❌ عذراً، لا يمكنك إزالة التحذيرات عن شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });
        }

        const key = `${guild.id}_${user.id}`;
        userWarnings.delete(key);

        await sendLog(guild, 'warn', '🗑️ سجل إزالة التحذيرات (Unwarn)', 0x2ECC71, [
          { name: '👤 العضو:', value: `${user} (${user.tag})`, inline: false },
          { name: '🛡️ الإداري:', value: `${interaction.user} (${interaction.user.tag})`, inline: false }
        ]);

        return interaction.reply({ content: `✅ تم مسح كافة التحذيرات عن العضو **${user.tag}** بنجاح.`, ephemeral: true });
      }

      if (commandName === 'warnings-all') {
        const guildWarns = Array.from(userWarnings.entries())
          .filter(([key]) => key.startsWith(`${guild.id}_`));

        if (guildWarns.length === 0) {
          return interaction.reply({ content: '❌ لا توجد أي تحذيرات مسجلة في هذا السيرفر حالياً.', ephemeral: true });
        }

        let desc = '📋 **قائمة الأعضاء الذين عليهم تحذيرات في السيرفر:**\n\n';
        guildWarns.forEach(([key, warns]) => {
          const userId = key.split('_')[1];
          desc += `👤 <@${userId}> ➔ عدد التحذيرات: **${warns.length}**\n`;
          warns.forEach((w, i) => {
            desc += `   \`#${i + 1}\` السبب: ${w.reason} (بواسطة: ${w.admin})\n`;
          });
          desc += '\n';
        });

        const embed = new EmbedBuilder()
          .setTitle('⚠️ سجل كافة تحذيرات السيرفر')
          .setDescription(desc.substring(0, 4096))
          .setColor(0xE74C3C)
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (commandName === 'warnings-member') {
        const user = options.getUser('العضو');
        const key = `${guild.id}_${user.id}`;
        const warns = userWarnings.get(key) || [];

        if (warns.length === 0) {
          return interaction.reply({ content: `✅ العضو **${user.tag}** ليس لديه أي تحذيرات مسجلة.`, ephemeral: true });
        }

        let desc = `📋 **تحذيرات العضو ${user}:**\n\n`;
        warns.forEach((w, i) => {
          desc += `\`#${i + 1}\` السبب: **${w.reason}**\n   🛡️ بواسطة: ${w.admin} \vert{} 📅 <t:${Math.floor(w.date / 1000)}:R>\n\n`;
        });

        const embed = new EmbedBuilder()
          .setTitle(`⚠️ سجل تحذيرات: ${user.username}`)
          .setDescription(desc)
          .setColor(0xE74C3C)
          .setThumbnail(user.displayAvatarURL())
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (commandName === 'warnings-clear-all') {
        let count = 0;
        for (const key of userWarnings.keys()) {
          if (key.startsWith(`${guild.id}_`)) {
            userWarnings.delete(key);
            count++;
          }
        }

        await sendLog(guild, 'warn', '🗑️ حذف جميع تحذيرات السيرفر', 0xE74C3C, [
          { name: '🛡️ الإداري المسؤول:', value: `${interaction.user} (${interaction.user.tag})`, inline: false }
        ]);

        return interaction.reply({ content: `✅ تمت مسح وحذف جميع التحذيرات في السيرفر بنجاح (تمت إزالة سجلات ${count} عضو).`, ephemeral: true });
      }

      if (commandName === 'azkar-setup') {
        const targetChannel = options.getChannel('القناة');
        const hours = options.getInteger('الساعات');
        
        azkarSettings.set(guild.id, {
          channelId: targetChannel.id,
          intervalHours: hours,
          lastSent: Date.now()
        });

        const embed = new EmbedBuilder()
          .setTitle('📿 تم إعداد نظام الأذكار بنجاح!')
          .setDescription(`سيتم إرسال الأذكار تلقائياً في القناة ${targetChannel} كل **${hours} ساعات**.`)
          .setColor(0x2ECC71);

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (commandName === 'azkar') {
        const randomZikr = azkarList[Math.floor(Math.random() * azkarList.length)];
        const embed = new EmbedBuilder()
          .setTitle('📿 ذِكْرُ الله')
          .setDescription(`> **${randomZikr}**`)
          .setColor(0xE74C3C)
          .setFooter({ text: `طلب بواسطة ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'admin-setup') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle('🛡️ لوحة التحكم بصلاحيات الأوامر الإدارية')
          .setDescription('اختر الأمر الإداري لتحديد رتبة معينة لاستخدامه:')
          .setColor(0xE74C3C);

        const menu = new StringSelectMenuBuilder()
          .setCustomId('select_admin_command')
          .setPlaceholder('اختر الأمر الإداري...')
          .addOptions(
            { label: 'حظر العضو (Ban)', value: 'ban', emoji: '🔨' },
            { label: 'طرد العضو (Kick)', value: 'kick', emoji: '👢' },
            { label: 'كتم مؤقت (Timeout)', value: 'timeout', emoji: '⏰' },
            { label: 'تحذير إداري (Warn)', value: 'warn', emoji: '⚠️' }
          );

        return interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
      }

      if (commandName === 'level-setup') {
        await interaction.deferReply({ ephemeral: true });
        const currentLvlSet = levelSettings.get(guild.id) || { enabled: false, xpPerMessage: 15, voiceXpEnabled: true, managerRoleId: null };
        
        const toggleBtnLabel = currentLvlSet.enabled ? 'إيقاف نظام اللفلات 🛑' : 'تفعيل نظام اللفلات ✅';
        const toggleBtnStyle = currentLvlSet.enabled ? ButtonStyle.Danger : ButtonStyle.Success;
        const managerRoleText = currentLvlSet.managerRoleId ? `<@&${currentLvlSet.managerRoleId}>` : 'غير محدد (الأدمشن فقط) ❌';

        const embed = new EmbedBuilder()
          .setTitle('⭐ لوحة إعدادات نظام اللفلات (Levels & XP)')
          .setDescription(`حالة النظام الحالي: **${currentLvlSet.enabled ? '🟢 مفعل' : '🔴 متوقف'}**\nقيمة XP الرسالة الواحدة: **${currentLvlSet.xpPerMessage} XP**\nكسب XP من الرومات الصوتية: **${currentLvlSet.voiceXpEnabled ? '✅ مفعل' : '❌ متوقف'}**\n🏷️ رتبة مشرفي الإعدادات: ${managerRoleText}\n📈 *معلومة: متطلبات الـ XP تزداد بنسبة 20% لكل لفل.*`)
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lvl_toggle_system').setLabel(toggleBtnLabel).setStyle(toggleBtnStyle),
          new ButtonBuilder().setCustomId('lvl_set_xp_amount').setLabel('تحديد XP الرسالة الواحدة ✍️').setStyle(ButtonStyle.Primary)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lvl_toggle_voice').setLabel(currentLvlSet.voiceXpEnabled ? 'إيقاف تفاعل الصوت 🎙️' : 'تشغيل تفاعل الصوت 🎙️').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('lvl_set_manager_role_btn').setLabel('تحديد رتبة التعديل 🏷️').setStyle(ButtonStyle.Secondary)
        );

        return interaction.editReply({ embeds: [embed], components: [row1, row2] });
      }

      if (commandName === 'level') {
        await interaction.deferReply();
        const targetUser = options.getUser('العضو') || interaction.user;
        const key = `${guild.id}_${targetUser.id}`;
        const userData = userLevels.get(key) || { xp: 0, level: 0 };
        const nextLevelXp = getRequiredXp(userData.level);

        try {
          const canvas = createCanvas(800, 260);
          const ctx = canvas.getContext('2d');

          ctx.fillStyle = '#0f0f12';
          ctx.beginPath();
          ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
          ctx.fill();

          ctx.fillStyle = '#1e1e24';
          ctx.beginPath();
          ctx.roundRect(240, 175, 510, 28, 14);
          ctx.fill();

          const percentage = Math.min(userData.xp / nextLevelXp, 1);
          const progressWidth = Math.max(percentage * 510, 28);
          
          const redGradient = ctx.createLinearGradient(240, 0, 750, 0);
          redGradient.addColorStop(0, '#ff2a2a');
          redGradient.addColorStop(1, '#990000');
          
          ctx.fillStyle = redGradient;
          ctx.beginPath();
          ctx.roundRect(240, 175, progressWidth, 28, 14);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 32px sans-serif';
          ctx.fillText(targetUser.username, 240, 65);

          ctx.fillStyle = '#ff4d4d';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText(`LEVEL: ${userData.level}`, 240, 110);

          ctx.fillStyle = '#cccccc';
          ctx.font = '18px sans-serif';
          ctx.fillText(`XP: ${userData.xp} /${nextLevelXp}`, 400, 110);

          ctx.save();
          ctx.beginPath();
          ctx.arc(120, 130, 72, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.clip();

          const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
          const avatar = await loadImage(avatarURL);
          ctx.drawImage(avatar, 48, 58, 144, 144);
          ctx.restore();

          const attachment = { attachment: canvas.toBuffer('image/png'), name: 'rank-card.png' };
          return interaction.editReply({ files: [attachment] });
        } catch (err) {
          console.error(err);
          return interaction.editReply({ content: `❌ حدث خطأ أثناء إنشاء بطاقة اللفل.` });
        }
      }

      if (commandName === 'ping') return interaction.reply({ content: `🏓 السرعة: **${client.ws.ping}ms**`, ephemeral: true });

      if (commandName === 'avatar') {
        const user = options.getUser('العضو') || interaction.user;
        const embed = new EmbedBuilder().setTitle(`🖼️ صورة ${user.username}`).setImage(user.displayAvatarURL({ dynamic: true, size: 1024 })).setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'user-info') {
        const user = options.getUser('العضو') || interaction.user;
        const targetMember = await guild.members.fetch(user.id).catch(() => null);
        const embed = new EmbedBuilder()
          .setTitle(`👤 معلومات: ${user.username}`)
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: '🆔 الايدي:', value: user.id, inline: true },
            { name: '📅 إنشاء الحساب:', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: '📥 الانضمام:', value: targetMember ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>` : 'غير معروف', inline: true }
          )
          .setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'server-info') {
        const embed = new EmbedBuilder()
          .setTitle(`🏰 سيرفر: ${guild.name}`)
          .setThumbnail(guild.iconURL())
          .addFields(
            { name: '👑 المالك:', value: `<@${guild.ownerId}>`, inline: true },
            { name: '👥 الأعضاء:', value: `${guild.memberCount}`, inline: true },
            { name: '💬 الرومات:', value: `${guild.channels.cache.size}`, inline: true }
          )
          .setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'clear') {
        const amount = options.getInteger('العدد');
        if (amount < 1 || amount > 100) return interaction.reply({ content: '❌ اختر عدداً بين 1 و 100.', ephemeral: true });
        await channel.bulkDelete(amount, true).catch(() => {});
        return interaction.reply({ content: `🧹 تم مسح **${amount}** رسالة.`, ephemeral: true });
      }

      if (commandName === 'lock') {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
        return interaction.reply({ content: '🔒 **تم قفل الروم الحالية.**' });
      }
      if (commandName === 'unlock') {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true });
        return interaction.reply({ content: '🔓 **تم فتح الروم الحالية.**' });
      }

      if (commandName === 'ticket-setup') {
        await interaction.deferReply({ ephemeral: true });
        const config = ticketConfigs.get(guild.id) || {};
        
        const embed = new EmbedBuilder()
          .setTitle('🎫 إعدادات نظام التذاكر المتقدم')
          .setDescription('قم بتخصيص لوحة ونظام التذاكر بالكامل عبر الأزرار أدناه:')
          .addFields(
            { name: '🎨 اللون الحالي:', value: config.colorName || 'بنفسجي 💜', inline: true },
            { name: '🏷️ رتبة الدعم:', value: config.supportRoleId ? `<@&${config.supportRoleId}>` : 'غير محدد ❌', inline: true },
            { name: '📁 الكاتيجوري:', value: config.categoryId ? `<#${config.categoryId}>` : 'غير محدد ❌', inline: true },
            { name: '❓ السبب إلزامي:', value: config.requireReason ? '✅ مفعل' : '❌ متوقف', inline: true },
            { name: '⭐ نظام التقييم:', value: config.ratingEnabled ? '✅ مفعل' : '❌ متوقف', inline: true },
            { name: '📊 روم التقييمات:', value: config.ratingChannelId ? `<#${config.ratingChannelId}>` : 'غير محدد ❌', inline: true }
          )
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('tk_set_color').setLabel('تغيير لون البانل 🎨').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('tk_set_support_role').setLabel('تحديد رتبة الدعم 🛡️').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('tk_remove_support_role').setLabel('إزالة رتبة الدعم ❌').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('tk_set_category').setLabel('تحديد category 📁').setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('tk_toggle_reason').setLabel(config.requireReason ? 'إيقاف السبب 🔴' : 'تفعيل السبب 🟢').setStyle(config.requireReason ? ButtonStyle.Danger : ButtonStyle.Success),
          new ButtonBuilder().setCustomId('tk_toggle_rating').setLabel(config.ratingEnabled ? 'إيقاف التقييمات 🔴' : 'تفعيل التقييمات 🟢').setStyle(config.ratingEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
          new ButtonBuilder().setCustomId('tk_set_rating_room').setLabel('تحديد روم التقييمات ⭐️').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('tk_set_banner').setLabel('تحديد صورة البانر 🖼️').setStyle(ButtonStyle.Secondary)
        );

        const row3 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('tk_edit_button').setLabel('تعديل الزر ✏️').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('tk_set_welcome_msg').setLabel('رسالة فتح التكت 💬').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('tk_send_embed').setLabel('نشر اللوحة 🚀').setStyle(ButtonStyle.Danger)
        );

        return interaction.editReply({ embeds: [embed], components: [row1, row2, row3] });
      }

      if (commandName === 'تقديم') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle('📂 لوحة إدارة التقديمات الأربعة المطورة')
          .setDescription('اختر التقديم لتعديل اسم التقديم والبانر، تعيين الـ 5 أسئلة، رتبة القبول، وروم استقبال الطلبات:')
          .setColor(0xE74C3C);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('app_cfg_1').setLabel('تقديم (1)').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('app_cfg_2').setLabel('تقديم (2)').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('app_cfg_3').setLabel('تقديم (3)').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('app_cfg_4').setLabel('تقديم (4)').setStyle(ButtonStyle.Primary)
        );
        return interaction.editReply({ embeds: [embed], components: [row] });
      }

      if (commandName === 'logs') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder().setTitle('📑 إعداد السجلات الشاملة').setDescription('اختر نوع السجل وتحديد قناته:').setColor(0xE74C3C);
        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('set_log_ban').setLabel('سجل الباند 🔨').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('set_log_kick').setLabel('سجل الطرد 👢').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('set_log_timeout').setLabel('سجل التايم ⏰').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('set_log_warn').setLabel('سجل التحذير ⚠️').setStyle(ButtonStyle.Secondary)
        );
        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('set_log_jail').setLabel('سجل السجن ⛓️').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('set_log_ticket').setLabel('سجل التكت 🎫').setStyle(ButtonStyle.Success)
        );
        return interaction.editReply({ embeds: [embed], components: [row1, row2] });
      }

      if (commandName === 'afk') {
        const reason = options.getString('سبب') || 'لا يوجد سبب';
        afkUsers.set(interaction.user.id, { reason, timestamp: Date.now() });
        return interaction.reply({ content: `💤 تم تفعيل وضع AFK. السبب: **${reason}**` });
      }

      if (commandName === 'ban') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);

        if (targetMember && !canPunish(member, targetMember)) {
          return interaction.reply({ content: '❌ عذراً، لا يمكنك حظر نفسك أو شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });
        }

        await guild.members.ban(user.id, { reason });
        
        await sendLog(guild, 'ban', '🔨 سجل حظر جديد (Ban)', 0xE74C3C, [
          { name: '👤 العضو المعاقب:', value: `${user} (${user.tag})`, inline: false },
          { name: '📝 سبب العقوبة:', value: reason, inline: false },
          { name: '🛡️ الإداري:', value: `${interaction.user} (${interaction.user.tag})`, inline: false }
        ]);

        return interaction.reply({ content: `✅ تم حظر العضو **${user.tag}**.`, ephemeral: true });
      }

      if (commandName === 'kick') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
        if (!canPunish(member, targetMember)) return interaction.reply({ content: '❌ عذراً، لا يمكنك طرد نفسك أو شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });

        await targetMember.kick(reason);

        await sendLog(guild, 'kick', '👢 سجل طرد جديد (Kick)', 0xE74C3C, [
          { name: '👤 العضو المعاقب:', value: `${user} (${user.tag})`, inline: false },
          { name: '📝 سبب العقوبة:', value: reason, inline: false },
          { name: '🛡️ الإداري:', value: `${interaction.user} (${interaction.user.tag})`, inline: false }
        ]);

        return interaction.reply({ content: `✅ تم طرد العضو **${user.tag}**.`, ephemeral: true });
      }

      if (commandName === 'timeout') {
        const user = options.getUser('العضو');
        const duration = options.getInteger('المدة');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
        if (!canPunish(member, targetMember)) return interaction.reply({ content: '❌ عذراً، لا يمكنك كتم نفسك أو شخص يمتلك رتبة مساوية أو أعلى منك!', ephemeral: true });

        await targetMember.timeout(duration, reason);

        await sendLog(guild, 'timeout', '⏰ سجل كتم مؤقت (Timeout)', 0xE74C3C, [
          { name: '👤 العضو المعاقب:', value: `${user} (${user.tag})`, inline: false },
          { name: '📝 سبب العقوبة:', value: reason, inline: false },
          { name: '🛡️ الإداري:', value: `${interaction.user} (${interaction.user.tag})`, inline: false }
        ]);

        return interaction.reply({ content: `✅ تم كتم العضو **${user.tag}**.`, ephemeral: true });
      }
    }

    if (interaction.isRoleSelectMenu()) {
      if (interaction.customId === 'jail_set_role') {
        const roleId = interaction.values[0];
        let current = jailSettings.get(interaction.guild.id) || {};
        current.roleId = roleId;
        jailSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `✅ تم تحديد رتبة السجين: <@&${roleId}>`, ephemeral: true });
      }

      if (interaction.customId === 'jail_set_jailer_role') {
        const roleId = interaction.values[0];
        let current = jailSettings.get(interaction.guild.id) || {};
        current.jailerRoleId = roleId;
        jailSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `✅ تم تحديد رتبة السجان: <@&${roleId}>`, ephemeral: true });
      }

      if (interaction.customId === 'lvl_set_manager_role_menu') {
        const roleId = interaction.values[0];
        let currentLvlSet = levelSettings.get(interaction.guild.id) || { enabled: false, xpPerMessage: 15, voiceXpEnabled: true, managerRoleId: null };
        currentLvlSet.managerRoleId = roleId;
        levelSettings.set(interaction.guild.id, currentLvlSet);
        return interaction.reply({ content: `✅ تم تحديد رتبة مشرفي إعدادات ونظام اللفلات بنجاح: <@&${roleId}>`, ephemeral: true });
      }

      if (interaction.customId === 'tk_set_support_role_menu') {
        const roleId = interaction.values[0];
        let config = ticketConfigs.get(interaction.guild.id) || {};
        config.supportRoleId = roleId;
        ticketConfigs.set(interaction.guild.id, config);
        return interaction.reply({ content: `✅ تم تحديد رتبة الدعم بنجاح: <@&${roleId}>`, ephemeral: true });
      }

      if (interaction.customId.startsWith('app_set_role_menu_')) {
        const appNum = interaction.customId.replace('app_set_role_menu_', '');
        const roleId = interaction.values[0];
        const key = `${interaction.guild.id}_${appNum}`;
        let data = applicationsData.get(key) || {};
        data.roleId = roleId;
        applicationsData.set(key, data);
        return interaction.reply({ content: `✅ تم تحديد رتبة القبول للتقديم (${appNum}) بنجاح: <@&${roleId}>`, ephemeral: true });
      }
    }

    if (interaction.isChannelSelectMenu()) {
      const id = interaction.customId;
      if (id.startsWith('select_channel_')) {
        const logType = id.replace('select_channel_', '');
        const selectedChannelId = interaction.values[0];
        if (!logChannels.has(interaction.guild.id)) logChannels.set(interaction.guild.id, {});
        logChannels.get(interaction.guild.id)[logType] = selectedChannelId;
        return interaction.reply({ content: `✅ تم تحديد قناة (${logType.toUpperCase()}) بنجاح!`, ephemeral: true });
      }

      if (id === 'jail_set_text_channel') {
        const channelId = interaction.values[0];
        let current = jailSettings.get(interaction.guild.id) || {};
        current.textChannelId = channelId;
        jailSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `✅ تم تحديد روم كتابة السجناء: <#${channelId}>`, ephemeral: true });
      }

      if (id === 'jail_set_log_channel') {
        const channelId = interaction.values[0];
        let current = jailSettings.get(interaction.guild.id) || {};
        current.logChannelId = channelId;
        jailSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `✅ تم تحديد قناة سجل السجن: <#${channelId}>`, ephemeral: true });
      }

      if (id === 'tk_set_category_menu') {
        const catId = interaction.values[0];
        let config = ticketConfigs.get(interaction.guild.id) || {};
        config.categoryId = catId;
        ticketConfigs.set(interaction.guild.id, config);
        return interaction.reply({ content: `✅ تم تحديد الـ Category الخاص بالتكتات بنجاح: <#${catId}>`, ephemeral: true });
      }

      if (id === 'tk_set_rating_channel_menu') {
        const chanId = interaction.values[0];
        let config = ticketConfigs.get(interaction.guild.id) || {};
        config.ratingChannelId = chanId;
        ticketConfigs.set(interaction.guild.id, config);
        return interaction.reply({ content: `✅ تم تحديد روم التقييمات بنجاح: <#${chanId}>`, ephemeral: true });
      }

      if (id.startsWith('app_set_channel_menu_')) {
        const appNum = interaction.customId.replace('app_set_channel_menu_', '');
        const channelId = interaction.values[0];
        const key = `${interaction.guild.id}_${appNum}`;
        let data = applicationsData.get(key) || {};
        data.logChannelId = channelId;
        applicationsData.set(key, data);
        return interaction.reply({ content: `✅ تم تحديد روم وصول طلبات التقديم (${appNum}) بنجاح: <#${channelId}>`, ephemeral: true });
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'sc_select_command_menu') {
        const selectedOrigCmd = interaction.values[0];
        const modal = new ModalBuilder()
          .setCustomId(`sc_modal_save_${selectedOrigCmd}`)
          .setTitle(`إنشاء اختصار لـ /${selectedOrigCmd}`);

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('shortcut_alias_input')
              .setLabel('اكتب الاختصار (مثلاً: b أو k)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
        return await interaction.showModal(modal);
      }

      if (interaction.customId === 'tk_color_select_menu') {
        const colorVal = interaction.values[0];
        let config = ticketConfigs.get(interaction.guild.id) || {};
        config.colorName = colorVal;
        
        if (colorVal === 'بنفسجي 💜') config.hexColor = 0x9B59B6;
        else if (colorVal === 'احمر ❤️') config.hexColor = 0xE74C3C;
        else if (colorVal === 'ازرق 💙') config.hexColor = 0x3498DB;
        else if (colorVal === 'اخضر 💚') config.hexColor = 0x2ECC71;
        else config.hexColor = 0xE74C3C;

        ticketConfigs.set(interaction.guild.id, config);
        return interaction.reply({ content: `✅ تم تغيير لون بانل التكت إلى: **${colorVal}**`, ephemeral: true });
      }
    }

    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id === 'lvl_toggle_system') {
        let currentLvlSet = levelSettings.get(interaction.guild.id) || { enabled: false, xpPerMessage: 15, voiceXpEnabled: true, managerRoleId: null };
        currentLvlSet.enabled = !currentLvlSet.enabled;
        levelSettings.set(interaction.guild.id, currentLvlSet);

        const toggleBtnLabel = currentLvlSet.enabled ? 'إيقاف نظام اللفلات 🛑' : 'تفعيل نظام اللفلات ✅';
        const toggleBtnStyle = currentLvlSet.enabled ? ButtonStyle.Danger : ButtonStyle.Success;
        const managerRoleText = currentLvlSet.managerRoleId ? `<@&${currentLvlSet.managerRoleId}>` : 'غير محدد (الأدمشن فقط) ❌';

        const embed = new EmbedBuilder()
          .setTitle('⭐ لوحة إعدادات نظام اللفلات (Levels & XP)')
          .setDescription(`حالة النظام الحالي: **${currentLvlSet.enabled ? '🟢 مفعل' : '🔴 متوقف'}**\nقيمة XP الرسالة الواحدة: **${currentLvlSet.xpPerMessage} XP**\nكسب XP من الرومات الصوتية: **${currentLvlSet.voiceXpEnabled ? '✅ مفعل' : '❌ متوقف'}**\n🏷️ رتبة مشرفي الإعدادات: ${managerRoleText}\n📈 *متطلبات الـ XP تزداد بنسبة 20% لكل لفل.*`)
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lvl_toggle_system').setLabel(toggleBtnLabel).setStyle(toggleBtnStyle),
          new ButtonBuilder().setCustomId('lvl_set_xp_amount').setLabel('تحديد XP الرسالة الواحدة ✍️').setStyle(ButtonStyle.Primary)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lvl_toggle_voice').setLabel(currentLvlSet.voiceXpEnabled ? 'إيقاف تفاعل الصوت 🎙️' : 'تشغيل تفاعل الصوت 🎙️').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('lvl_set_manager_role_btn').setLabel('تحديد رتبة التعديل 🏷️').setStyle(ButtonStyle.Secondary)
        );

        return interaction.update({ embeds: [embed], components: [row1, row2] });
      }

      if (id === 'lvl_set_xp_amount') {
        const modal = new ModalBuilder().setCustomId('lvl_modal_set_xp').setTitle('تحديد مقدار الـ XP للرسالة الواحدة');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('xp_amount_input')
              .setLabel('اكتب عدد نقاط XP (مثلاً: 15 أو 20)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
        return await interaction.showModal(modal);
      }

      if (id === 'lvl_toggle_voice') {
        let currentLvlSet = levelSettings.get(interaction.guild.id) || { enabled: false, xpPerMessage: 15, voiceXpEnabled: true, managerRoleId: null };
        currentLvlSet.voiceXpEnabled = !currentLvlSet.voiceXpEnabled;
        levelSettings.set(interaction.guild.id, currentLvlSet);

        const toggleBtnLabel = currentLvlSet.enabled ? 'إيقاف نظام اللفلات 🛑' : 'تفعيل نظام اللفلات ✅';
        const toggleBtnStyle = currentLvlSet.enabled ? ButtonStyle.Danger : ButtonStyle.Success;
        const managerRoleText = currentLvlSet.managerRoleId ? `<@&${currentLvlSet.managerRoleId}>` : 'غير محدد (الأدمشن فقط) ❌';

        const embed = new EmbedBuilder()
          .setTitle('⭐ لوحة إعدادات نظام اللفلات (Levels & XP)')
          .setDescription(`حالة النظام الحالي: **${currentLvlSet.enabled ? '🟢 مفعل' : '🔴 متوقف'}**\nقيمة XP الرسالة الواحدة: **${currentLvlSet.xpPerMessage} XP**\nكسب XP من الرومات الصوتية: **${currentLvlSet.voiceXpEnabled ? '✅ مفعل' : '❌ متوقف'}**\n🏷️ رتبة مشرفي الإعدادات: ${managerRoleText}\n📈 *متطلبات الـ XP تزداد بنسبة 20% لكل لفل.*`)
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lvl_toggle_system').setLabel(toggleBtnLabel).setStyle(toggleBtnStyle),
          new ButtonBuilder().setCustomId('lvl_set_xp_amount').setLabel('تحديد XP الرسالة الواحدة ✍️').setStyle(ButtonStyle.Primary)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lvl_toggle_voice').setLabel(currentLvlSet.voiceXpEnabled ? 'إيقاف تفاعل الصوت 🎙️' : 'تشغيل تفاعل الصوت 🎙️').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('lvl_set_manager_role_btn').setLabel('تحديد رتبة التعديل 🏷️').setStyle(ButtonStyle.Secondary)
        );

        return interaction.update({ embeds: [embed], components: [row1, row2] });
      }

      if (id === 'lvl_set_manager_role_btn') {
        const roleMenu = new RoleSelectMenuBuilder()
          .setCustomId('lvl_set_manager_role_menu')
          .setPlaceholder('اختر الرتبة المخولة بتعديل إعدادات اللفل...');
        return interaction.reply({ content: '🏷️ اختر الرتبة التي تسمح لأصحابها بتعديل إعدادات اللفلات والتحكم بها:', components: [new ActionRowBuilder().addComponents(roleMenu)], ephemeral: true });
      }

      if (id === 'bw_add_word') {
        const modal = new ModalBuilder().setCustomId('bw_modal_add').setTitle('إضافة كلمة ممنوعة جديدة');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('word_input').setLabel('اكتب الكلمة المراد حظرها').setStyle(TextInputStyle.Short).setRequired(true)));
        return await interaction.showModal(modal);
      }

      if (id === 'bw_list_words') {
        const wordsSet = badWordsDB.get(interaction.guild.id) || new Set();
        if (wordsSet.size === 0) return interaction.reply({ content: '❌ لا توجد أي كلمات ممنوعة مسجلة حالياً.', ephemeral: true });
        const wordsArray = Array.from(wordsSet).map((w, index) => `${index + 1}. \`${w}\``).join('\n');
        const embed = new EmbedBuilder().setTitle('📋 قائمة الكلمات المحظورة').setDescription(wordsArray).setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (id === 'bw_set_punishment') {
        const embed = new EmbedBuilder().setTitle('⚖️ تحديد العقوبة التلقائية للكلمات الممنوعة').setDescription('اختر العقوبة المناسبة من الأزرار أدناه:').setColor(0xE74C3C);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('bw_pun_delete').setLabel('حذف الرسالة').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('bw_pun_timeout').setLabel('كتم العضو').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('bw_pun_kick').setLabel('طرد العضو').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('bw_pun_ban').setLabel('حظر العضو').setStyle(ButtonStyle.Danger)
        );
        return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }

      if (id.startsWith('bw_pun_')) {
        const punType = id.replace('bw_pun_', '');
        badWordsPunishment.set(interaction.guild.id, punType);
        return interaction.reply({ content: `✅ تم تحديث عقوبة الكلمات الممنوعة إلى: **${punType.toUpperCase()}**`, ephemeral: true });
      }

      if (id === 'bw_remove_word') {
        const modal = new ModalBuilder().setCustomId('bw_modal_remove').setTitle('إزالة كلمة من القائمة');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('word_remove_input').setLabel('اكتب الكلمة المراد إزالتها').setStyle(TextInputStyle.Short).setRequired(true)));
        return await interaction.showModal(modal);
      }

      if (id === 'bw_clear_all') {
        badWordsDB.set(interaction.guild.id, new Set());
        badWordsPunishment.set(interaction.guild.id, 'delete');
        return interaction.reply({ content: '🗑️ تم إفراغ وإلغاء جميع الكلمات المحظورة.', ephemeral: true });
      }

      if (id === 'sc_create') {
        const embed = new EmbedBuilder().setTitle('🔗 اختيار الأمر لعمل اختصار له').setDescription('اختر الأمر الإداري من القائمة أدناه:').setColor(0xE74C3C);
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('sc_select_command_menu')
          .setPlaceholder('اختر الأمر الإداري...')
          .addOptions(
            { label: 'حظر (ban)', value: 'ban', emoji: '🔨' },
            { label: 'طرد (kick)', value: 'kick', emoji: '👢' },
            { label: 'كتم مؤقت (timeout)', value: 'timeout', emoji: '⏰' },
            { label: 'رفع الكتم (untimeout)', value: 'untimeout', emoji: '🔊' },
            { label: 'تحذير (warn)', value: 'warn', emoji: '⚠️' },
            { label: 'سجن (jail)', value: 'jail', emoji: '⛓️' },
            { label: 'إفراج السجن (unjail)', value: 'unjail', emoji: '🔓' },
            { label: 'مسح رسائل (clear)', value: 'clear', emoji: '🧹' }
          );
        return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true });
      }

      if (id === 'sc_list') {
        const guildShortcuts = Array.from(customShortcuts.entries()).filter(([k]) => k.startsWith(interaction.guild.id));
        if (guildShortcuts.length === 0) return interaction.reply({ content: '❌ لا توجد أي اختصارات مسجلة.', ephemeral: true });

        const listText = guildShortcuts.map(([key, orig]) => {
          const alias = key.replace(`${interaction.guild.id}_`, '');
          return `🔹 الاختصار: \`!${alias}\` ➡️ الأمر: \`/${orig}\``;
        }).join('\n');

        const embed = new EmbedBuilder().setTitle('📜 قائمة الاختصارات النشطة').setDescription(listText).setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (id === 'sc_delete') {
        const modal = new ModalBuilder().setCustomId('sc_modal_delete_alias').setTitle('حذف اختصار');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('alias_to_delete').setLabel('اكتب اسم الاختصار المراد حذفه').setStyle(TextInputStyle.Short).setRequired(true)));
        return await interaction.showModal(modal);
      }

      if (id === 'prot_toggle_links') {
        let current = protectionSettings.get(interaction.guild.id) || { antiSpam: false, antiLinks: false };
        current.antiLinks = !current.antiLinks;
        protectionSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `🛡️ تم **${current.antiLinks ? 'تفعيل' : 'إيقاف'}** حماية الروابط.`, ephemeral: true });
      }

      if (id === 'prot_toggle_spam') {
        let current = protectionSettings.get(interaction.guild.id) || { antiSpam: false, antiLinks: false };
        current.antiSpam = !current.antiSpam;
        protectionSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `⚡ تم **${current.antiSpam ? 'تفعيل' : 'إيقاف'}** حماية السبام.`, ephemeral: true });
      }

      // ==========================================
      // أزرار وإعدادات التذاكر الجديدة المضافة
      // ==========================================
      if (id === 'tk_set_color') {
        const colorMenu = new StringSelectMenuBuilder()
          .setCustomId('tk_color_select_menu')
          .setPlaceholder('اختر لون بانل التكت...')
          .addOptions(
            { label: 'بنفسجي 💜', value: 'بنفسجي 💜' },
            { label: 'احمر ❤️', value: 'احمر ❤️' },
            { label: 'ازرق 💙', value: 'ازرق 💙' },
            { label: 'اخضر 💚', value: 'اخضر 💚' }
          );
        return interaction.reply({ content: '🎨 اختر لون بانل التكت من القائمة أدناه:', components: [new ActionRowBuilder().addComponents(colorMenu)], ephemeral: true });
      }

      if (id === 'tk_set_support_role') {
        const roleMenu = new RoleSelectMenuBuilder().setCustomId('tk_set_support_role_menu').setPlaceholder('اختر رتبة الدعم...');
        return interaction.reply({ content: '🛡️ اختر رتبة الدعم الفني:', components: [new ActionRowBuilder().addComponents(roleMenu)], ephemeral: true });
      }

      if (id === 'tk_remove_support_role') {
        let config = ticketConfigs.get(interaction.guild.id) || {};
        config.supportRoleId = null;
        ticketConfigs.set(interaction.guild.id, config);
        return interaction.reply({ content: '✅ تمت إزالة رتبة الدعم بنجاح.', ephemeral: true });
      }

      if (id === 'tk_set_category') {
        const catMenu = new ChannelSelectMenuBuilder().setCustomId('tk_set_category_menu').setPlaceholder('اختر الـ category لتنشاء فيها التكتات...').addChannelTypes(ChannelType.GuildCategory);
        return interaction.reply({ content: '📁 اختر الـ category لتنشاء فيها التكتات:', components: [new ActionRowBuilder().addComponents(catMenu)], ephemeral: true });
      }

      if (id === 'tk_toggle_reason') {
        let config = ticketConfigs.get(interaction.guild.id) || {};
        config.requireReason = !config.requireReason;
        ticketConfigs.set(interaction.guild.id, config);
        return interaction.reply({ content: `✅ تم ${config.requireReason ? 'تفعيل' : 'إيقاف'} إجبارية كتابة السبب عند فتح التكت.`, ephemeral: true });
      }

      if (id === 'tk_toggle_rating') {
        let config = ticketConfigs.get(interaction.guild.id) || {};
        config.ratingEnabled = !config.ratingEnabled;
        ticketConfigs.set(interaction.guild.id, config);
        return interaction.reply({ content: `✅ تم ${config.ratingEnabled ? 'تفعيل' : 'إيقاف'} نظام تقييم الإداريين بعد إغلاق التكت.`, ephemeral: true });
      }

      if (id === 'tk_set_rating_room') {
        const chanMenu = new ChannelSelectMenuBuilder().setCustomId('tk_set_rating_channel_menu').setPlaceholder('اختر روم وصول التقييمات...').addChannelTypes(ChannelType.GuildText);
        return interaction.reply({ content: '⭐️ اختر روم وصول تقييمات الإداريين:', components: [new ActionRowBuilder().addComponents(chanMenu)], ephemeral: true });
      }

      if (id === 'tk_set_banner') {
        const modal = new ModalBuilder().setCustomId('tk_modal_banner').setTitle('تحديد صورة بانر التكت');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('banner_url_input').setLabel('رابط الصورة (Image URL)').setStyle(TextInputStyle.Short).setRequired(true)));
        return await interaction.showModal(modal);
      }

      if (id === 'tk_edit_button') {
        const modal = new ModalBuilder().setCustomId('tk_modal_edit_button').setTitle('تعديل اسم ولون زر فتح التكت');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('btn_name_input').setLabel('اسم زر فتح التذكرة').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('btn_color_input').setLabel('لون الزر (danger, primary, success, secondary)').setStyle(TextInputStyle.Short).setRequired(true))
        );
        return await interaction.showModal(modal);
      }

      if (id === 'tk_set_welcome_msg') {
        const modal = new ModalBuilder().setCustomId('tk_modal_welcome_msg').setTitle('تحديد رسالة فتح التكت');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('welcome_text_input').setLabel('الرسالة التي تظهر أول ما تفتح تكت').setStyle(TextInputStyle.Paragraph).setRequired(true)));
        return await interaction.showModal(modal);
      }

      if (id === 'tk_send_embed') {
        const config = ticketConfigs.get(interaction.guild.id) || {};
        const embed = new EmbedBuilder()
          .setTitle(config.title || '🎫 نظام التذاكر والدعم الفني')
          .setDescription(config.desc || 'اضغط على الزر أدناه لفتح تذكرة جديدة.')
          .setColor(config.hexColor || 0xE74C3C);

        if (config.bannerUrl && config.bannerUrl.startsWith('http')) {
          embed.setImage(config.bannerUrl);
        }

        const btnLabel = config.buttonName || 'فتح تذكرة';
        let btnStyle = ButtonStyle.Danger;
        if (config.buttonStyle === 'primary') btnStyle = ButtonStyle.Primary;
        else if (config.buttonStyle === 'success') btnStyle = ButtonStyle.Success;
        else if (config.buttonStyle === 'secondary') btnStyle = ButtonStyle.Secondary;

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('create_ticket_btn').setLabel(btnLabel).setEmoji('🎫').setStyle(btnStyle)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: '🚀 تم نشر لوحة التذاكر بنجاح!', ephemeral: true });
      }

      if (id === 'create_ticket_btn') {
        const config = ticketConfigs.get(interaction.guild.id) || {};
        if (config.requireReason) {
          const modal = new ModalBuilder().setCustomId('ticket_reason_modal').setTitle('سبب فتح التذكرة');
          modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_reason_input').setLabel('يرجى كتابة سبب فتح التذكرة:').setStyle(TextInputStyle.Paragraph).setRequired(true)));
          return await interaction.showModal(modal);
        } else {
          return await createTicketChannel(interaction, 'لا يوجد سبب محدد');
        }
      }

      // زر استلام التكت
      if (id === 'ticket_claim') {
        const tInfo = activeTickets.get(interaction.channel.id);
        if (!tInfo) return interaction.reply({ content: '❌ هذه التذكرة غير مسجلة.', ephemeral: true });
        if (tInfo.claimedBy) return interaction.reply({ content: `⚠️ تم استلام هذه التذكرة مسبقاً بواسطة <@${tInfo.claimedBy}>`, ephemeral: true });

        const config = ticketConfigs.get(interaction.guild.id) || {};
        const supportRoleId = config.supportRoleId;

        // التحقق من أن المستخدم إداري أو لديه رتبة الدعم
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && (!supportRoleId || !interaction.member.roles.cache.has(supportRoleId))) {
          return interaction.reply({ content: '❌ عذراً، أزرار الإدارة مخصصة لفريق الدعم فقط!', ephemeral: true });
        }

        tInfo.claimedBy = interaction.user.id;
        activeTickets.set(interaction.channel.id, tInfo);

        // تعديل الصلاحيات: صاحب التذكرة والمستلم يمكنهم الكتابة والرؤية، وباقي أعضاء الدعم مقفل عنهم الكتابة ويرون فقط
        await interaction.channel.permissionOverwrites.edit(tInfo.ownerId, { ViewChannel: true, SendMessages: true });
        await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });
        
        if (supportRoleId) {
          await interaction.channel.permissionOverwrites.edit(supportRoleId, { ViewChannel: true, SendMessages: false });
        }

        const oldEmbed = interaction.message.embeds[0];
        const updatedEmbed = EmbedBuilder.from(oldEmbed)
          .addFields({ name: '👤 المستلم:', value: `${interaction.user}`, inline: false });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_claim').setLabel('تم الاستلام ✅').setStyle(ButtonStyle.Success).setDisabled(true),
          new ButtonBuilder().setCustomId('ticket_call_support').setLabel('استدعاء الدعم 🟢').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('close_ticket').setLabel('غلق 🗑️').setStyle(ButtonStyle.Danger)
        );

        await interaction.update({ embeds: [updatedEmbed], components: [row] });
        return interaction.followUp({ content: `✅ قام الإداري ${interaction.user} باستلام التذكرة!` });
      }

      // زر استدعاء الدعم باللون الأخضر
      if (id === 'ticket_call_support') {
        const config = ticketConfigs.get(interaction.guild.id) || {};
        const supportRoleId = config.supportRoleId;
        const mentionText = supportRoleId ? `<@&${supportRoleId}>` : '@everyone';
        return interaction.reply({ content: `🔔 تم استدعاء فريق الدعم بواسطة ${interaction.user}:${mentionText}` });
      }

      if (id === 'close_ticket') {
        const tInfo = activeTickets.get(interaction.channel.id);
        const config = ticketConfigs.get(interaction.guild.id) || {};

        if (config.ratingEnabled && tInfo) {
          const ratingMenu = new StringSelectMenuBuilder()
            .setCustomId(`ticket_rate_${tInfo.ownerId}_${tInfo.claimedBy || 'none'}`)
            .setPlaceholder('اختر تقييم الإداري من 5 نجوم ⭐️')
            .addOptions(
              { label: '⭐️⭐️⭐️⭐️⭐️ (5 نجوم)', value: '5' },
              { label: '⭐️⭐️⭐️⭐️ (4 نجوم)', value: '4' },
              { label: '⭐️⭐️⭐️ (3 نجوم)', value: '3' },
              { label: '⭐️⭐️ (نجمتان)', value: '2' },
              { label: '⭐️ (نجمة واحدة)', value: '1' }
            );

          await interaction.reply({ content: `⭐ يرجى من العضو <@${tInfo.ownerId}> تقييم أداء الإداري قبل إغلاق التذكرة نهائياً:`, components: [new ActionRowBuilder().addComponents(ratingMenu)] });
          return;
        }

        await interaction.reply({ content: '🔒 جاري إغلاق التذكرة وحذف الروم...', ephemeral: true });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
      }

      if (id.startsWith('app_cfg_')) {
        const appNum = id.replace('app_cfg_', '');
        const embed = new EmbedBuilder()
          .setTitle(`⚙️ إعدادات التقديم رقم (${appNum}) المطورة`)
          .setDescription('اختر الإجراء المناسب لإعداد اسم التقديم والبانر، أو تعيين الـ 5 أسئلة، رتبة القبول، أو روم الاستقبال:')
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`app_edit_name_banner_${appNum}`).setLabel('اسم التقديم والبانر 🏷️').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`app_edit_5_questions_${appNum}`).setLabel('إعداد الـ 5 أسئلة 📝').setStyle(ButtonStyle.Success)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`app_set_role_btn_${appNum}`).setLabel('تحديد رتبة القبول 🏷️').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`app_set_channel_btn_${appNum}`).setLabel('تحديد روم وصول الطلبات 📬').setStyle(ButtonStyle.Secondary)
        );

        const row3 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`app_send_room_${appNum}`).setLabel('نشر لوحة التقديم 📤').setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({ embeds: [embed], components: [row1, row2, row3], ephemeral: true });
      }

      if (id.startsWith('app_edit_name_banner_')) {
        const appNum = id.replace('app_edit_name_banner_', '');
        const modal = new ModalBuilder().setCustomId(`save_name_banner_${appNum}`).setTitle(`إعداد اسم وبانر تقديم (${appNum})`);
        
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('app_name').setLabel('اسم التقديم (مثلاً: تقديم الإدارة)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('app_banner').setLabel('رابط بانر التقديم (Image URL - اختياري)').setStyle(TextInputStyle.Short).setRequired(false))
        );
        return await interaction.showModal(modal);
      }

      if (id.startsWith('app_edit_5_questions_')) {
        const appNum = id.replace('app_edit_5_questions_', '');
        const modal = new ModalBuilder().setCustomId(`save_5_questions_${appNum}`).setTitle(`إعداد الأسئلة الخمسة لتقديم (${appNum})`);
        
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q1_input').setLabel('السؤال الأول (1)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q2_input').setLabel('السؤال الثاني (2)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q3_input').setLabel('السؤال الثالث (3)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q4_input').setLabel('السؤال الرابع (4)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q5_input').setLabel('السؤال الخامس (5)').setStyle(TextInputStyle.Short).setRequired(true))
        );
        return await interaction.showModal(modal);
      }

      if (id.startsWith('app_set_role_btn_')) {
        const appNum = id.replace('app_set_role_btn_', '');
        const roleMenu = new RoleSelectMenuBuilder().setCustomId(`app_set_role_menu_${appNum}`).setPlaceholder(`اختر رتبة القبول للتقديم (${appNum})...`);
        return interaction.reply({ content: `🏷️ اختر رتبة القبول التي سيحصل عليها العضو عند الموافقة عليه في التقديم (${appNum}):`, components: [new ActionRowBuilder().addComponents(roleMenu)], ephemeral: true });
      }

      if (id.startsWith('app_set_channel_btn_')) {
        const appNum = id.replace('app_set_channel_btn_', '');
        const channelMenu = new ChannelSelectMenuBuilder().setCustomId(`app_set_channel_menu_${appNum}`).setPlaceholder(`اختر روم وصول طلبات تقديم (${appNum})...`).addChannelTypes(ChannelType.GuildText);
        return interaction.reply({ content: `📬 اختر الروم التي ستصل إليها طلبات المتقدمين مع أزرار (أوافق / أرفق):`, components: [new ActionRowBuilder().addComponents(channelMenu)], ephemeral: true });
      }

      if (id.startsWith('app_send_room_')) {
        const appNum = id.replace('app_send_room_', '');
        const data = applicationsData.get(`${interaction.guild.id}_${appNum}`);
        if (!data || !data.name) return interaction.reply({ content: '❌ يرجى ضبط اسم التقديم والأسئلة أولاً!', ephemeral: true });

        const embed = new EmbedBuilder()
          .setTitle(`📋 ${data.name}`)
          .setDescription('اضغط على الزر أدناه لفتح نموذج التقديم والإجابة على الأسئلة الـ 5:')
          .setColor(0xE74C3C);

        if (data.banner && data.banner.startsWith('http')) {
          embed.setImage(data.banner);
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`start_apply_${appNum}`).setLabel(`تقديم الان`).setEmoji('📝').setStyle(ButtonStyle.Danger)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: `✅ تم نشر لوحة (${data.name}) في هذه الروم بنجاح!`, ephemeral: true });
      }

      if (id.startsWith('start_apply_')) {
        const appNum = id.replace('start_apply_', '');
        const data = applicationsData.get(`${interaction.guild.id}_${appNum}`);
        if (!data || !data.q1) return interaction.reply({ content: '❌ عذراً، هذا التقديم غير مُكتمل الأسئلة بعد.', ephemeral: true });

        const modal = new ModalBuilder().setCustomId(`submit_apply_modal_${appNum}`).setTitle((data.name || 'تقديم').substring(0, 45));
        
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q_ans_1').setLabel(data.q1.substring(0, 45)).setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q_ans_2').setLabel(data.q2.substring(0, 45)).setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q_ans_3').setLabel(data.q3.substring(0, 45)).setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q_ans_4').setLabel(data.q4 ? data.q4.substring(0, 45) : 'السؤال الرابع').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q_ans_5').setLabel(data.q5 ? data.q5.substring(0, 45) : 'السؤال الخامس').setStyle(TextInputStyle.Short).setRequired(true))
        );
        return await interaction.showModal(modal);
      }

      if (id.startsWith('app_accept_') || id.startsWith('app_reject_')) {
        const isAccept = id.startsWith('app_accept_');
        const parts = id.split('_'); 
        const appNum = parts[2];
        const targetUserId = parts[3];

        const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
        const data = applicationsData.get(`${interaction.guild.id}_${appNum}`) || {};

        if (isAccept) {
          if (targetMember && data.roleId) {
            await targetMember.roles.add(data.roleId).catch(() => {});
          }

          const oldEmbed = interaction.message.embeds[0];
          const newEmbed = EmbedBuilder.from(oldEmbed)
            .setColor(0x2ECC71)
            .addFields({ name: '📊 حالة الطلب:', value: `✅ **تم القبول بواسطة** ${interaction.user}`, inline: false });

          await interaction.update({ embeds: [newEmbed], components: [] });
          
          if (targetMember) {
            targetMember.send(`🎉 مبارك يا عمرو! لقد تم **قبول** تقديمك في **${data.name || 'التقديم'}** وحصلت على الرتبة المخصصة.`).catch(() => {});
          }
        } else {
          const oldEmbed = interaction.message.embeds[0];
          const newEmbed = EmbedBuilder.from(oldEmbed)
            .setColor(0xE74C3C)
            .addFields({ name: '📊 حالة الطلب:', value: `❌ **تم الرفض بواسطة** ${interaction.user}`, inline: false });

          await interaction.update({ embeds: [newEmbed], components: [] });

          if (targetMember) {
            targetMember.send(`⚠️ نأسف لك، لقد تم **رفض** تقديمك في **${data.name || 'التقديم'}**.`).catch(() => {});
          }
        }
        return;
      }

      if (id.startsWith('set_log_')) {
        const logType = id.replace('set_log_', '');
        const selectMenu = new ChannelSelectMenuBuilder().setCustomId(`select_channel_${logType}`).setPlaceholder('اختر الروم المخصصة للسجل...').addChannelTypes(ChannelType.GuildText);
        return interaction.reply({ content: `📌 اختر القناة الخاصة بـ (${logType.toUpperCase()}):`, components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true });
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'lvl_modal_set_xp') {
        const val = parseInt(interaction.fields.getTextInputValue('xp_amount_input'));
        if (isNaN(val) || val <= 0) return interaction.reply({ content: '❌ يرجى إدخال رقم صحيح أكبر من صفر.', ephemeral: true });

        let currentLvlSet = levelSettings.get(interaction.guild.id) || { enabled: false, xpPerMessage: 15, voiceXpEnabled: true, managerRoleId: null };
        currentLvlSet.xpPerMessage = val;
        levelSettings.set(interaction.guild.id, currentLvlSet);

        return interaction.reply({ content: `✅ تم تحديث نقاط XP الرسالة الواحدة لتصبح **${val} XP**.`, ephemeral: true });
      }

      if (interaction.customId === 'bw_modal_add') {
        const newWord = interaction.fields.getTextInputValue('word_input').trim().toLowerCase();
        let wordsSet = badWordsDB.get(interaction.guild.id) || new Set();
        wordsSet.add(newWord);
        badWordsDB.set(interaction.guild.id, wordsSet);
        return interaction.reply({ content: `✅ تم إضافة الكلمة \`${newWord}\` للقائمة بنجاح!`, ephemeral: true });
      }

      if (interaction.customId === 'bw_modal_remove') {
        const wordToRemove = interaction.fields.getTextInputValue('word_remove_input').trim().toLowerCase();
        let wordsSet = badWordsDB.get(interaction.guild.id) || new Set();
        if (wordsSet.has(wordToRemove)) {
          wordsSet.delete(wordToRemove);
          badWordsDB.set(interaction.guild.id, wordsSet);
          return interaction.reply({ content: `✅ تم إزالة الكلمة \`${wordToRemove}\`.`, ephemeral: true });
        }
        return interaction.reply({ content: `❌ الكلمة غير موجودة.`, ephemeral: true });
      }

      if (interaction.customId.startsWith('sc_modal_save_')) {
        const origCmd = interaction.customId.replace('sc_modal_save_', '');
        const alias = interaction.fields.getTextInputValue('shortcut_alias_input').toLowerCase().trim().replace('!', '');
        customShortcuts.set(`${interaction.guild.id}_${alias}`, origCmd);
        return interaction.reply({ content: `⚡ تم إنشاء الاختصار بنجاح! \`!${alias}\` تنفذ الأمر \`/${origCmd}\`.`, ephemeral: true });
      }

      if (interaction.customId === 'sc_modal_delete_alias') {
        const alias = interaction.fields.getTextInputValue('alias_to_delete').toLowerCase().trim().replace('!', '');
        const key = `${interaction.guild.id}_${alias}`;
        if (customShortcuts.has(key)) {
          customShortcuts.delete(key);
          return interaction.reply({ content: `✅ تم حذف الاختصار \`!${alias}\`.`, ephemeral: true });
        }
        return interaction.reply({ content: `❌ الاختصار غير موجود.`, ephemeral: true });
      }

      if (interaction.customId === 'save_ticket_panel') {
        ticketData.set(interaction.guild.id, { title: interaction.fields.getTextInputValue('tk_title'), desc: interaction.fields.getTextInputValue('tk_desc') });
        return interaction.reply({ content: '✨ تم حفظ بيانات التذكرة بنجاح!', ephemeral: true });
      }

      if (interaction.customId === 'ticket_reason_modal') {
        const reason = interaction.fields.getTextInputValue('ticket_reason_input');
        return await createTicketChannel(interaction, reason);
      }

      if (interaction.customId === 'tk_modal_banner') {
        const url = interaction.fields.getTextInputValue('banner_url_input');
        let config = ticketConfigs.get(interaction.guild.id) || {};
        config.bannerUrl = url;
        ticketConfigs.set(interaction.guild.id, config);
        return interaction.reply({ content: '✅ تم حفظ صورة البانر بنجاح!', ephemeral: true });
      }

      if (interaction.customId === 'tk_modal_edit_button') {
        const name = interaction.fields.getTextInputValue('btn_name_input');
        const style = interaction.fields.getTextInputValue('btn_color_input').toLowerCase();
        let config = ticketConfigs.get(interaction.guild.id) || {};
        config.buttonName = name;
        config.buttonStyle = style;
        ticketConfigs.set(interaction.guild.id, config);
        return interaction.reply({ content: `✅ تم تعديل الزر إلى: **${name}** باللون **${style}**`, ephemeral: true });
      }

      if (interaction.customId === 'tk_modal_welcome_msg') {
        const msg = interaction.fields.getTextInputValue('welcome_text_input');
        let config = ticketConfigs.get(interaction.guild.id) || {};
        config.welcomeMessage = msg;
        ticketConfigs.set(interaction.guild.id, config);
        return interaction.reply({ content: '✅ تم حفظ رسالة فتح التكت بنجاح!', ephemeral: true });
      }

      if (interaction.customId.startsWith('save_name_banner_')) {
        const appNum = interaction.customId.replace('save_name_banner_', '');
        const key = `${interaction.guild.id}_${appNum}`;
        let existing = applicationsData.get(key) || {};

        existing.name = interaction.fields.getTextInputValue('app_name');
        existing.banner = interaction.fields.getTextInputValue('app_banner');
        applicationsData.set(key, existing);

        return interaction.reply({ content: '✅ تم حفظ اسم التقديم ورابط البانر بنجاح!', ephemeral: true });
      }

      if (interaction.customId.startsWith('save_5_questions_')) {
        const appNum = interaction.customId.replace('save_5_questions_', '');
        const key = `${interaction.guild.id}_${appNum}`;
        let existing = applicationsData.get(key) || {};

        existing.q1 = interaction.fields.getTextInputValue('q1_input');
        existing.q2 = interaction.fields.getTextInputValue('q2_input');
        existing.q3 = interaction.fields.getTextInputValue('q3_input');
        existing.q4 = interaction.fields.getTextInputValue('q4_input');
        existing.q5 = interaction.fields.getTextInputValue('q5_input');
        applicationsData.set(key, existing);

        return interaction.reply({ content: '✅ تم حفظ الأسئلة الخمسة للتقديم بنجاح!', ephemeral: true });
      }

      if (interaction.customId.startsWith('submit_apply_modal_')) {
        const appNum = interaction.customId.replace('submit_apply_modal_', '');
        const key = `${interaction.guild.id}_${appNum}`;
        const data = applicationsData.get(key) || {};

        const ans1 = interaction.fields.getTextInputValue('q_ans_1');
        const ans2 = interaction.fields.getTextInputValue('q_ans_2');
        const ans3 = interaction.fields.getTextInputValue('q_ans_3');
        const ans4 = interaction.fields.getTextInputValue('q_ans_4');
        const ans5 = interaction.fields.getTextInputValue('q_ans_5');

        const embed = new EmbedBuilder()
          .setTitle(`📥 طلب تقديم جديد: ${data.name || `تقديم (${appNum})`}`)
          .setColor(0xE74C3C)
          .addFields(
            { name: '👤 المتقدم:', value: `${interaction.user} (${interaction.user.tag})`, inline: false },
            { name: `📝 1. ${data.q1 || 'السؤال 1'}:`, value: `> ${ans1}`, inline: false },
            { name: `📝 2. ${data.q2 || 'السؤال 2'}:`, value: `> ${ans2}`, inline: false },
            { name: `📝 3. ${data.q3 || 'السؤال 3'}:`, value: `> ${ans3}`, inline: false },
            { name: `📝 4. ${data.q4 || 'السؤال 4'}:`, value: `> ${ans4}`, inline: false },
            { name: `📝 5. ${data.q5 || 'السؤال 5'}:`, value: `> ${ans5}`, inline: false }
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`app_accept_${appNum}_${interaction.user.id}`).setLabel('قبول الطلب').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`app_app_reject_${appNum}_${interaction.user.id}`).setLabel('رفض الطلب').setStyle(ButtonStyle.Danger)
        );

        if (data.logChannelId) {
          const logChan = interaction.guild.channels.cache.get(data.logChannelId);
          if (logChan) {
            await logChan.send({ embeds: [embed], components: [row] });
          }
        }

        return interaction.reply({ content: '✅ تم إرسال إجاباتك بنجاح للإدارة، انتظر الرد قريباً!', ephemeral: true });
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('ticket_rate_')) {
        const parts = interaction.customId.split('_');
        const ownerId = parts[2];
        const claimedById = parts[3];
        const rating = interaction.values[0];

        const config = ticketConfigs.get(interaction.guild.id) || {};
        if (config.ratingChannelId) {
          const rChan = interaction.guild.channels.cache.get(config.ratingChannelId);
          if (rChan) {
            const adminText = claimedById !== 'none' ? `<@${claimedById}>` : 'لم يتم الاستلام';
            const rateEmbed = new EmbedBuilder()
              .setTitle('⭐️ تقييم تذكرة جديد')
              .addFields(
                { name: '👤 العضو المقيم:', value: `<@${interaction.user.id}>`, inline: false },
                { name: '🛡️ الإداري المسؤول:', value: adminText, inline: false },
                { name: '⭐️ التقييم:', value: `${rating} من 5 نجوم ⭐️`, inline: false }
              )
              .setColor(0xE74C3C)
              .setTimestamp();
            rChan.send({ embeds: [rateEmbed] }).catch(() => {});
          }
        }

        await interaction.reply({ content: `✅ شكراً لك على تقييمك (${rating} نجوم)! سيتم إغلاق التذكرة الآن.`, ephemeral: true });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
      }
    }
  } catch (err) {
    console.error(err);
  }
});

// دالة مساعدة لإنشاء روم التذكرة والصلاحيات والأزرار المطلوبة
async function createTicketChannel(interaction, reason) {
  const config = ticketConfigs.get(interaction.guild.id) || {};
  const categoryId = config.categoryId || null;
  const supportRoleId = config.supportRoleId || null;

  // الصلاحيات: صاحب التذكرة والمستلم والإداريون يראون ويكتبون، باقي أعضاء السيرفر لا يرون شيئاً
  const permissionOverwrites = [
    { id: interaction.guild.id, denied: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allowed: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
  ];

  if (supportRoleId) {
    permissionOverwrites.push({ id: supportRoleId, allowed: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
  }

  const ticketChannel = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username}`,
    type: ChannelType.GuildText,
    parent: categoryId,
    permissionOverwrites: permissionOverwrites
  });

  activeTickets.set(ticketChannel.id, { ownerId: interaction.user.id, claimedBy: null });

  const welcomeText = config.welcomeMessage || 'يرجى انتظار مسؤولين التذكرة الرد عليك';
  const embed = new EmbedBuilder()
    .setDescription(`> **${welcomeText}**\n\n**السبب**\n> \`${reason}\``)
    .setColor(config.hexColor || 0xE74C3C);

  if (config.bannerUrl && config.bannerUrl.startsWith('http')) {
    embed.setImage(config.bannerUrl);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('استلام').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ticket_call_support').setLabel('طلب الدعم').setEmoji('🎙️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('close_ticket').setLabel('غلق').setEmoji('🗑️').setStyle(ButtonStyle.Secondary)
  );

  const mentionString = supportRoleId ? `<@&${supportRoleId}> ${interaction.user}` : `${interaction.user}`;
  await ticketChannel.send({ content: mentionString, embeds: [embed], components: [row] });
  return interaction.reply({ content: `✅ تم إنشاء تذكرتك بنجاح: ${ticketChannel}`, ephemeral: true });
}

// تسجيل الأوامر عند تشغيل البوت
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}! 🤖`);
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Successfully registered application commands.');
  } catch (error) {
    console.error(error);
  }
});

client.login(process.env.TOKEN);
